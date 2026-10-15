window.KAHANOV_CASE_STUDIES = Array.from({ length: 24 }, function (_, index) {
  const chapterNumber = index + 1;
  const chapterFolder = "Chapter " + chapterNumber;
  const paddedChapter = String(chapterNumber).padStart(2, "0");

  return {
    number: chapterNumber,
    title: chapterFolder,
    count: 2,
    zipHref: "downloads/case-studies/Chapter_" + paddedChapter + "_Case_Studies.zip",
    documents: [1, 2].map(function (caseNumber) {
      const filename = "Kahanov2E_chap" + paddedChapter + "_CS_" + caseNumber + ".docx";
      return {
        title: "Case Study " + caseNumber,
        filename: filename,
        href: "Assets/Case%20study/" + encodeURIComponent(chapterFolder) + "/" + encodeURIComponent(filename)
      };
    })
  };
});
