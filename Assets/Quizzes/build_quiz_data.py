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


def main():
    files = sorted(SOURCE.glob("Kahanov2E_CQ_*_Answers.docx"))
    quizzes = [parse_chapter(file) for file in files]
    if [q["number"] for q in quizzes] != list(range(1, 25)):
        raise ValueError("Expected chapter quizzes 1 through 24")
    OUTPUT.write_text(
        "// Generated from Kahanov2E_Chapter_Quizzes_Answer_Keys by build_quiz_data.py.\n"
        + "window.KAHANOV_QUIZZES = " + json.dumps(quizzes, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(quizzes)} chapters and {sum(len(q['questions']) for q in quizzes)} questions to {OUTPUT.name}")


if __name__ == "__main__":
    main()
