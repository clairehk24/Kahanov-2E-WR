(function () {
  "use strict";

  const quizzes = window.KAHANOV_QUIZZES || [];
  const byId = (id) => document.getElementById(id);
  const setup = byId("quiz-setup");
  const session = byId("quiz-session");
  const results = byId("quiz-results");
  const chapterList = byId("quiz-chapter-list");
  const chapterPicker = byId("quiz-chapter-picker");
  const chapterSummary = byId("quiz-chapter-summary");
  const startButton = byId("quiz-start");
  const questionNav = byId("quiz-question-nav");
  const answerControls = byId("quiz-answer-controls");
  const feedback = byId("quiz-feedback");
  const selfCheck = byId("quiz-self-check");
  const status = byId("quiz-status");
  const finishButton = byId("quiz-finish");
  const submitButton = byId("quiz-submit");
  const backResultsButton = byId("quiz-back-results");
  let currentQuiz = null;
  let answers = [];
  let currentIndex = 0;
  let reviewMode = false;
  let completedAt = null;
  let selectedQuizNumber = null;
  const chapterRadios = [];

  function answerIsComplete(answer) {
    return answer.submitted && answer.verdict !== null;
  }

  function score() {
    return answers.filter((answer) => answer.verdict === true).length;
  }

  function textLine(parent, label, value, className) {
    const line = document.createElement("span");
    if (className) line.className = className;
    if (label) {
      const strong = document.createElement("strong");
      strong.textContent = label;
      line.append(strong);
    }
    line.append(document.createTextNode(value));
    parent.append(line);
    return line;
  }

  function correctAnswerText(question) {
    return question.options
      .filter((option) => option.correct)
      .map((option) => option.label + ". " + option.text)
      .join("; ");
  }

  function studentAnswerText(question, answer) {
    if (question.type === "written") return answer.text.trim();
    return question.options
      .filter((option) => answer.selected.includes(option.label))
      .map((option) => option.label + ". " + option.text)
      .join("; ");
  }

  function updateProgress() {
    if (!currentQuiz) return;
    const complete = answers.filter(answerIsComplete).length;
    byId("quiz-progress").textContent = complete + " of " + answers.length + " submitted";
    finishButton.disabled = complete !== answers.length;
    status.textContent = reviewMode
      ? "Review your submitted answers."
      : complete === answers.length
        ? "All answers are complete. You can see your results."
        : "Choose any question above. Submit each answer to finish the quiz.";
  }

  function renderQuestionNav() {
    questionNav.replaceChildren();
    currentQuiz.questions.forEach((question, index) => {
      const answer = answers[index];
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(question.number);
      const state = answerIsComplete(answer) ? (answer.verdict ? "correct" : "incorrect") : answer.submitted ? "needs self-check" : "not submitted";
      button.setAttribute("aria-label", "Question " + question.number + ", " + state);
      if (index === currentIndex) button.setAttribute("aria-current", "step");
      if (answerIsComplete(answer)) button.classList.add(answer.verdict ? "is-correct" : "is-incorrect");
      button.addEventListener("click", () => goToQuestion(index));
      questionNav.append(button);
    });
    updateProgress();
  }

  function renderFeedback() {
    const question = currentQuiz.questions[currentIndex];
    const answer = answers[currentIndex];
    feedback.replaceChildren();
    feedback.className = "quiz-feedback";
    feedback.hidden = !answer.submitted;
    selfCheck.hidden = true;
    if (!answer.submitted) return;

    if (question.type === "written") {
      const message = answer.verdict === null
        ? "Compare your response with the manuscript answer, then mark how you did."
        : answer.verdict
          ? "You marked your answer correct."
          : "You marked your answer as needing review.";
      textLine(feedback, "Self-check: ", message);
      textLine(feedback, "Reference Answer: ", question.referenceAnswer, "quiz-reference-answer");
      if (answer.verdict !== null) feedback.classList.add(answer.verdict ? "is-correct" : "is-incorrect");
      selfCheck.hidden = reviewMode || answer.verdict !== null;
    } else {
      textLine(feedback, "", answer.verdict ? "Correct." : "Incorrect.");
      textLine(feedback, "Correct Answer: ", correctAnswerText(question), "quiz-reference-answer");
      feedback.classList.add(answer.verdict ? "is-correct" : "is-incorrect");
    }
  }

  function markDraft() {
    const answer = answers[currentIndex];
    answer.submitted = false;
    answer.verdict = null;
    renderFeedback();
    renderQuestionNav();
  }

  function renderQuestion() {
    const question = currentQuiz.questions[currentIndex];
    const answer = answers[currentIndex];
    byId("quiz-session-title").textContent = "Chapter " + currentQuiz.number + " Quiz";
    byId("quiz-question-kicker").textContent = "Question " + question.number + " of " + currentQuiz.questions.length + (question.type === "multiple" ? " · Select All That Apply" : question.type === "written" ? " · Written Response" : "");
    byId("quiz-question-title").textContent = question.prompt;
    answerControls.replaceChildren();

    if (question.type === "written") {
      const textarea = document.createElement("textarea");
      textarea.className = "quiz-written-answer";
      textarea.setAttribute("aria-label", "Your answer to question " + question.number);
      textarea.maxLength = 4000;
      textarea.value = answer.text;
      textarea.disabled = reviewMode || answer.submitted;
      textarea.addEventListener("input", () => {
        if (answer.submitted || reviewMode) return;
        answer.text = textarea.value;
        markDraft();
      });
      answerControls.append(textarea);
    } else {
      const list = document.createElement("div");
      list.className = "quiz-answer-list";
      question.options.forEach((option) => {
        const label = document.createElement("label");
        label.className = "quiz-option";
        const input = document.createElement("input");
        input.type = question.type === "multiple" ? "checkbox" : "radio";
        input.name = "quiz-question-choice";
        input.value = option.label;
        input.checked = answer.selected.includes(option.label);
        input.disabled = reviewMode || answer.submitted;
        input.addEventListener("change", () => {
          if (answer.submitted || reviewMode) return;
          if (question.type === "multiple") {
            if (input.checked) answer.selected.push(option.label);
            else answer.selected = answer.selected.filter((label) => label !== option.label);
          } else {
            answer.selected = [option.label];
          }
          markDraft();
        });
        const choiceText = document.createElement("span");
        choiceText.textContent = option.label + ". " + option.text;
        label.append(input, choiceText);
        list.append(label);
      });
      answerControls.append(list);
    }

    byId("quiz-previous").disabled = currentIndex === 0;
    byId("quiz-next").disabled = currentIndex === currentQuiz.questions.length - 1;
    submitButton.hidden = reviewMode;
    submitButton.disabled = reviewMode || answer.submitted;
    submitButton.textContent = answer.submitted ? "Answer Submitted" : "Submit Answer";
    finishButton.hidden = reviewMode;
    backResultsButton.hidden = !reviewMode;
    renderFeedback();
    renderQuestionNav();
  }

  function goToQuestion(index) {
    currentIndex = index;
    renderQuestion();
    byId("quiz-question-title").tabIndex = -1;
    byId("quiz-question-title").focus({ preventScroll: true });
  }

  function showSession() {
    setup.hidden = false;
    session.hidden = false;
    results.hidden = true;
    renderQuestion();
    session.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function startQuiz(quiz) {
    currentQuiz = quiz;
    selectedQuizNumber = quiz.number;
    chapterRadios.forEach((radio) => { radio.checked = Number(radio.value) === quiz.number; });
    chapterSummary.textContent = "Chapter " + quiz.number + " selected";
    startButton.disabled = true;
    chapterPicker.open = false;
    answers = quiz.questions.map(() => ({ selected: [], text: "", submitted: false, verdict: null }));
    currentIndex = 0;
    reviewMode = false;
    completedAt = null;
    showSession();
  }

  function submitAnswer() {
    const question = currentQuiz.questions[currentIndex];
    const answer = answers[currentIndex];
    if (reviewMode || answer.submitted) return;
    if (question.type === "written") {
      if (!answer.text.trim()) {
        status.textContent = "Enter your answer before submitting this question.";
        answerControls.querySelector("textarea").focus();
        return;
      }
      answer.submitted = true;
      answer.verdict = null;
    } else {
      if (!answer.selected.length) {
        status.textContent = "Choose an answer before submitting this question.";
        answerControls.querySelector("input").focus();
        return;
      }
      const correct = question.options.filter((option) => option.correct).map((option) => option.label);
      answer.submitted = true;
      answer.verdict = answer.selected.length === correct.length && answer.selected.every((label) => correct.includes(label));
    }
    answerControls.querySelectorAll("input, textarea").forEach((control) => { control.disabled = true; });
    submitButton.disabled = true;
    submitButton.textContent = "Answer Submitted";
    renderFeedback();
    renderQuestionNav();
  }

  function markWrittenAnswer(isCorrect) {
    const answer = answers[currentIndex];
    if (!answer.submitted || answer.verdict !== null) return;
    answer.verdict = isCorrect;
    renderFeedback();
    renderQuestionNav();
  }

  function showResults() {
    if (answers.some((answer) => !answerIsComplete(answer))) return;
    if (!completedAt) completedAt = new Date();
    reviewMode = false;
    session.hidden = true;
    setup.hidden = false;
    results.hidden = false;
    byId("quiz-results-title").textContent = "Chapter " + currentQuiz.number + " Quiz Results";
    byId("quiz-score").textContent = score() + " / " + answers.length;
    const writtenCount = currentQuiz.questions.filter((question) => question.type === "written").length;
    byId("quiz-results-summary").textContent = (score() / answers.length * 100).toFixed(0) + "% correct. " + (writtenCount ? writtenCount + " written " + (writtenCount === 1 ? "response was" : "responses were") + " scored by your self-check." : "All questions were graded from the answer key.");
    const list = byId("quiz-result-list");
    list.replaceChildren();
    currentQuiz.questions.forEach((question, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Question " + question.number;
      button.addEventListener("click", () => {
        reviewMode = true;
        currentIndex = index;
        showSession();
      });
      const outcome = document.createElement("span");
      outcome.textContent = answers[index].verdict ? "Correct" : "Needs Review";
      item.append(button, outcome);
      list.append(item);
    });
    byId("quiz-download-status").textContent = "";
    results.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function createReportPages(studentName) {
    const pages = [];
    let ctx;
    let y;

    function newPage() {
      const canvas = document.createElement("canvas");
      canvas.width = 1224;
      canvas.height = 1584;
      ctx = canvas.getContext("2d");
      ctx.scale(2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 612, 792);
      ctx.fillStyle = "#00376b";
      ctx.fillRect(0, 0, 612, 46);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Arial";
      ctx.fillText("CHAPTER QUIZ RESULTS", 42, 29);
      ctx.fillStyle = "#5c6670";
      ctx.font = "11px Arial";
      ctx.fillText("Clinical Foundations of Athletic Training and Sports Medicine, Second Edition", 42, 769);
      pages.push(canvas);
      y = 74;
    }

    function addLine(line, options = {}) {
      const size = options.size || 11;
      const lineHeight = options.lineHeight || size * 1.45;
      ctx.font = (options.bold ? "bold " : "") + size + "px Arial";
      const maxWidth = 528;
      const parts = String(line).split("\n");
      parts.forEach((part) => {
        const words = part.split(/\s+/);
        let row = "";
        words.forEach((word) => {
          if (ctx.measureText(word).width > maxWidth) {
            if (row) drawRow(row);
            row = "";
            for (const character of word) {
              if (ctx.measureText(row + character).width > maxWidth && row) {
                drawRow(row);
                row = character;
              } else {
                row += character;
              }
            }
            return;
          }
          const proposed = row ? row + " " + word : word;
          if (ctx.measureText(proposed).width > maxWidth && row) {
            drawRow(row);
            row = word;
          } else {
            row = proposed;
          }
        });
        drawRow(row);
      });

      function drawRow(row) {
        if (y + lineHeight > 742) {
          newPage();
          ctx.font = (options.bold ? "bold " : "") + size + "px Arial";
        }
        ctx.fillStyle = options.color || "#252a30";
        ctx.fillText(row, 42, y);
        y += lineHeight;
      }
    }

    newPage();
    addLine("Chapter " + currentQuiz.number + " Quiz", { size: 22, bold: true, lineHeight: 31, color: "#102f57" });
    addLine("Student: " + studentName, { bold: true });
    addLine("Completed: " + new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(completedAt));
    addLine("Score: " + score() + " of " + answers.length + " (" + (score() / answers.length * 100).toFixed(0) + "%)", { size: 15, bold: true, lineHeight: 25, color: "#00376b" });
    if (currentQuiz.questions.some((question) => question.type === "written")) {
      addLine("Written responses were scored by the student after comparing with the supplied reference answers.", { size: 10, color: "#5c6670" });
    }
    y += 12;
    currentQuiz.questions.forEach((question, index) => {
      if (y > 665) newPage();
      const answer = answers[index];
      addLine("Question " + question.number + " — " + (answer.verdict ? "Correct" : "Needs Review") + (question.type === "written" ? " (self-checked)" : ""), { size: 12, bold: true, lineHeight: 19, color: answer.verdict ? "#254a30" : "#892034" });
      addLine(question.prompt, { size: 10, lineHeight: 15 });
      addLine("Your answer: " + studentAnswerText(question, answer), { size: 10, lineHeight: 15 });
      y += 10;
    });
    return pages;
  }

  function pagesToPdf(pages) {
    const encoder = new TextEncoder();
    const objects = [null];
    const pageIds = pages.map((_, index) => 5 + index * 3);
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = "<< /Type /Pages /Kids [" + pageIds.map((id) => id + " 0 R").join(" ") + "] /Count " + pages.length + " >>";
    pages.forEach((canvas, index) => {
      const imageId = 3 + index * 3;
      const contentId = imageId + 1;
      const pageId = imageId + 2;
      const binary = atob(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
      const image = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      objects[imageId] = ["<< /Type /XObject /Subtype /Image /Width 1224 /Height 1584 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + image.length + " >>\nstream\n", image, "\nendstream"];
      const commands = "q 612 0 0 792 0 0 cm /Im0 Do Q";
      objects[contentId] = "<< /Length " + commands.length + " >>\nstream\n" + commands + "\nendstream";
      objects[pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 " + imageId + " 0 R >> >> /Contents " + contentId + " 0 R >>";
    });

    const chunks = [];
    const offsets = [0];
    let size = 0;
    function append(value) {
      const bytes = typeof value === "string" ? encoder.encode(value) : value;
      chunks.push(bytes);
      size += bytes.length;
    }
    append("%PDF-1.4\n");
    for (let id = 1; id < objects.length; id += 1) {
      offsets[id] = size;
      append(id + " 0 obj\n");
      const value = objects[id];
      (Array.isArray(value) ? value : [value]).forEach(append);
      append("\nendobj\n");
    }
    const xref = size;
    append("xref\n0 " + objects.length + "\n0000000000 65535 f \n");
    for (let id = 1; id < objects.length; id += 1) append(String(offsets[id]).padStart(10, "0") + " 00000 n \n");
    append("trailer\n<< /Size " + objects.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF");
    return new Blob(chunks, { type: "application/pdf" });
  }

  function downloadResults() {
    const nameInput = byId("quiz-student-name");
    const studentName = nameInput.value.trim();
    if (!studentName) {
      byId("quiz-download-status").textContent = "Enter your name to download a report for your instructor.";
      nameInput.focus();
      return;
    }
    const pdf = pagesToPdf(createReportPages(studentName));
    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Chapter_" + String(currentQuiz.number).padStart(2, "0") + "_Quiz_Results.pdf";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    byId("quiz-download-status").textContent = "Results PDF downloaded.";
  }

  quizzes.forEach((quiz) => {
    const label = document.createElement("label");
    label.className = "chapter-option";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "quiz-chapter";
    radio.value = String(quiz.number);
    radio.addEventListener("change", () => {
      selectedQuizNumber = quiz.number;
      chapterSummary.textContent = "Chapter " + quiz.number + " selected";
      startButton.disabled = false;
      chapterPicker.open = false;
    });
    const text = document.createElement("span");
    text.textContent = "Chapter " + quiz.number + " (" + quiz.questions.length + " questions)";
    label.append(radio, text);
    chapterList.append(label);
    chapterRadios.push(radio);
  });
  startButton.addEventListener("click", () => {
    const quiz = quizzes.find((item) => item.number === selectedQuizNumber);
    if (quiz) startQuiz(quiz);
  });
  byId("quiz-previous").addEventListener("click", () => goToQuestion(Math.max(0, currentIndex - 1)));
  byId("quiz-next").addEventListener("click", () => goToQuestion(Math.min(currentQuiz.questions.length - 1, currentIndex + 1)));
  submitButton.addEventListener("click", submitAnswer);
  byId("quiz-mark-correct").addEventListener("click", () => markWrittenAnswer(true));
  byId("quiz-mark-incorrect").addEventListener("click", () => markWrittenAnswer(false));
  finishButton.addEventListener("click", showResults);
  backResultsButton.addEventListener("click", showResults);
  byId("quiz-review").addEventListener("click", () => {
    reviewMode = true;
    currentIndex = 0;
    showSession();
  });
  byId("quiz-retry").addEventListener("click", () => startQuiz(currentQuiz));
  byId("quiz-choose-chapter").addEventListener("click", () => {
    chapterPicker.open = true;
    setup.scrollIntoView({ block: "start" });
    chapterSummary.focus({ preventScroll: true });
  });
  byId("quiz-download").addEventListener("click", downloadResults);
})();
