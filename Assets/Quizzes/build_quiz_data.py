"""Build the browser quiz data from the supplied chapter answer-key DOCX files."""
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import json
import re

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "Kahanov2E_Chapter_Quizzes_Answer_Keys"
OUTPUT = ROOT / "quizzes-data.js"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
QUESTION = re.compile(r"^(\d+)\.\s+(.+)$")
OPTION = re.compile(r"^(\*)?([a-z])\.\s+(.+)$")


def paragraphs(file):
    with ZipFile(file) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
    for para in document.iter(W + "p"):
        text = "".join(part.text or "" for part in para.iter(W + "t")).strip()
        if text:
            yield text


def parse_chapter(file):
    chapter_number = int(re.search(r"_CQ_(\d+)_", file.name).group(1))
    quiz = {"number": chapter_number, "questions": []}
    current = None
    pending_type = "MC"
    awaiting_question = False

    def finish():
        nonlocal current
        if current is None:
            return
        kind = current.pop("sourceType")
        options = current.pop("options")
        extra = current.pop("extra")
        if kind in ("E", "F"):
            if len(options) != 1 or options[0]["correct"]:
                raise ValueError(f"{file.name} question {current['number']}: invalid written answer")
            current["type"] = "written"
            current["referenceAnswer"] = "\n".join([options[0]["text"], *extra])
        else:
            if extra or len(options) < 2:
                raise ValueError(f"{file.name} question {current['number']}: invalid choices")
            correct_count = sum(item["correct"] for item in options)
            if (kind == "MC" and correct_count != 1) or (kind == "MR" and correct_count < 2):
                raise ValueError(f"{file.name} question {current['number']}: invalid answer key")
            current["type"] = "multiple" if kind == "MR" else "single"
            current["options"] = options
        quiz["questions"].append(current)
        current = None

    lines = list(paragraphs(file))
    if not lines or f"Chapter {chapter_number} Quiz" not in lines[0]:
        raise ValueError(f"{file.name}: chapter heading mismatch")
    for line in lines[1:]:
        if line.startswith("Type:"):
            pending_type = line.partition(":")[2].strip()
            if pending_type not in ("MC", "MR", "E", "F"):
                raise ValueError(f"{file.name}: unknown type {pending_type}")
            continue
        if line.startswith("Title:"):
            finish()
            awaiting_question = True
            continue
        match = QUESTION.match(line)
        if awaiting_question:
            number = int(match.group(1)) if match else len(quiz["questions"]) + 1
            prompt = match.group(2) if match else line
            current = {"number": number, "prompt": prompt, "sourceType": pending_type, "options": [], "extra": []}
            pending_type = "MC"
            awaiting_question = False
            continue
        if current is None:
            raise ValueError(f"{file.name}: unexpected text {line!r}")
        match = OPTION.match(line)
        if match:
            current["options"].append({"label": match.group(2), "text": match.group(3), "correct": bool(match.group(1))})
        elif current["sourceType"] in ("E", "F"):
            current["extra"].append(line)
        else:
            raise ValueError(f"{file.name} question {current['number']}: unexpected text {line!r}")
    finish()
    if [q["number"] for q in quiz["questions"]] != list(range(1, 11)):
        raise ValueError(f"{file.name}: expected questions 1 through 10")
    return quiz


def apply_proof_edits(quizzes):
    by_chapter = {quiz["number"]: quiz for quiz in quizzes}

    def question(chapter, number):
        return by_chapter[chapter]["questions"][number - 1]

    option_edits = {
        (2, 9, "c"): ("comparison and outcome model", "Comparison and outcome model"),
        (5, 10, "d"): ("secondary coverage", "Secondary coverage"),
        (8, 1, "a"): ("lower cost", "Lower cost"),
        (8, 1, "c"): ("previous relationship with primary care physician", "Previous relationship with primary care physician"),
        (8, 1, "d"): ("ability for immediate referral to specialists on site", "Ability for immediate referral to specialists on site"),
        (15, 9, "a"): ("axonotmesis", "Axonotmesis"),
        (15, 9, "b"): ("neurotmesis", "Neurotmesis"),
        (15, 9, "c"): ("neuropraxia", "Neuropraxia"),
    }
    for (chapter, number, label), (before, after) in option_edits.items():
        option = next(item for item in question(chapter, number)["options"] if item["label"] == label)
        if option["text"] != before:
            raise ValueError(f"Unexpected text in chapter {chapter}, question {number}, option {label}")
        option["text"] = after

    prompt = question(9, 4)["prompt"]
    before = "V\u0307O2max"
    if prompt.count(before) != 2:
        raise ValueError("Unexpected VO2max text in chapter 9, question 4")
    question(9, 4)["prompt"] = prompt.replace(before, "V\u0307O\u2082max")

    prompt = question(15, 6)["prompt"]
    if prompt.count("8to 15-year-old") != 1:
        raise ValueError("Unexpected age text in chapter 15, question 6")
    question(15, 6)["prompt"] = prompt.replace("8to 15-year-old", "8 to 15-year-old")

    option = next(item for item in question(18, 9)["options"] if item["label"] == "a")
    if option["text"].count("E. coli") != 1:
        raise ValueError("Unexpected E. coli text in chapter 18, question 9")
    option["italicizedPhrases"] = ["E. coli"]


def main():
    files = sorted(SOURCE.glob("Kahanov2E_CQ_*_Answers.docx"))
    quizzes = [parse_chapter(file) for file in files]
    if [q["number"] for q in quizzes] != list(range(1, 25)):
        raise ValueError("Expected chapter quizzes 1 through 24")
    apply_proof_edits(quizzes)
    OUTPUT.write_text(
        "// Generated from Kahanov2E_Chapter_Quizzes_Answer_Keys by build_quiz_data.py.\n"
        + "window.KAHANOV_QUIZZES = " + json.dumps(quizzes, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(quizzes)} chapters and {sum(len(q['questions']) for q in quizzes)} questions to {OUTPUT.name}")


if __name__ == "__main__":
    main()
