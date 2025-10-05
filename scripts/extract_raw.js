import { parsePDF } from './tools.js';
import fs from 'fs';

if (fs.existsSync('./raw_parsed')) fs.rmSync('./raw_parsed', { recursive: true, force: true });
fs.mkdirSync('./raw_parsed');

const processFile = async (file, id) => {
  const bulletinArrayBuffer = new Uint8Array(fs.readFileSync(file));
  const bulletinParsed = await parsePDF(bulletinArrayBuffer);

  console.log(`Writing ${id}.json out`)
  fs.writeFileSync(`./raw_parsed/${id}.json`, JSON.stringify(bulletinParsed), { encoding: 'utf8' });
}

(async () => {
  await processFile('./raw_data/1280/Unit No. 1280 Tabular Data Speed (mph) 103A1280.D29.pdf', '1280');
  await processFile('./raw_data/1336/Unit No. 1336 Tabular Data Speed (mph) 113A1336.D01.pdf', '1336');
})();