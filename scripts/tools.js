import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export const render_page = (pageData) => {

  return pageData.getTextContent({})
    .then(function (textContent) {
      let lines = {};

      for (let i = 0; i < textContent.items.length; i++) {
        const item = textContent.items[i];
        const [x, y, text] = [item.transform[4], item.transform[5], item.str];

        //console.log(x, y, text)

        if (!lines[y]) lines[y] = {};
        lines[y][x] = text;
      };

      // merging lines together if they're close enough together
      let mergedLines = {};
      let currentY = null;
      const newYValueMap = Object.keys(lines)
        .map(n => Number(n))
        .sort((a, b) => b - a)
        .map((y, i) => {
          if (i == 0) currentY = y;
          if (y + 5 < currentY) currentY = y;

          return [y, currentY];
        });

      newYValueMap.forEach((valueMap) => {
        if (!mergedLines[valueMap[1]]) mergedLines[valueMap[1]] = {};
        mergedLines[valueMap[1]] = {
          ...mergedLines[valueMap[1]],
          ...lines[valueMap[0]],
        };
      });

      return mergedLines;
    });
};

export const parsePDF = async (dataBuffer) => {
  let ret = {};
  let doc = await pdfjsLib.getDocument(dataBuffer).promise;
  ret.numpages = doc.numPages;

  let metaData = await doc.getMetadata().catch(function (err) {
    console.log('error with meta', err)
    return null;
  });

  ret.info = metaData ? metaData.info : null;
  ret.metadata = metaData ? metaData.metadata : null;

  let counter = doc.numPages;
  counter = counter > doc.numPages ? doc.numPages : counter;

  ret.pages = [];

  console.log(`Starting parsing. Total of ${counter} pages`);
  for (let i = 1; i <= counter; i++) {
    const page = await doc.getPage(i).then(pageData => render_page(pageData)).catch((err) => {
      console.log(`error with page ${i}:`, err)
    });
    if (i % 25 == 0) console.log(`${i}/${counter} (${((i / counter) * 100).toFixed(2)}%)`);

    ret.pages.push(page);
  }

  ret.numrender = counter;
  doc.destroy();

  return ret;
};

export const parseHHMM = (input) => {
  const HM = input.split(':').map((n) => Number(n));

  return {
    hours: HM[0],
    minutes: HM[1],
    totalMinutes: (HM[0] * 60) + HM[1],
  }
}

export const parseHoursMinutes = (input) => {
  const HM = input.split(' ').map((n) => Number(n)).filter((n) => !isNaN(n));

  while (HM.length < 2) HM.push(0);

  return {
    hours: HM[0],
    minutes: HM[1],
    totalMinutes: (HM[0] * 60) + HM[1],
  }
};