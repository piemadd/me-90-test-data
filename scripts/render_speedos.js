import fs from 'fs';
import { createCanvas } from 'canvas';

const filesToProcess = fs.readdirSync('./transformed');

if (fs.existsSync('./rendered')) fs.rmSync('./rendered', { recursive: true, force: true });
fs.mkdirSync('./rendered');

// config stuff idk
const FRAMES_PER_SECOND = 30;
const START_TIME = '10:23:00.0';
const END_TIME = '10:32:15.0';
const WIDTH = 1920;
const HEIGHT = 1080;
const BACKGROUND_COLOR = '#000';
const FOREGROUND_COLOR = '#fff';
const RENDER_TIME = true;

// auto calculated
// a lot of magic numbers, trust the process
const START_HMSD = START_TIME.split(/[:.]/).map((n) => Number(n));
const START_PSEUDO_FRAME =
  (START_HMSD[0] * 60 * 60 * FRAMES_PER_SECOND) + // hours
  (START_HMSD[1] * 60 * FRAMES_PER_SECOND) + // minutes
  (START_HMSD[2] * FRAMES_PER_SECOND) + // seconds
  (START_HMSD[3] / (FRAMES_PER_SECOND / 10)) // deciseconds

const calculateTimeForFrame = (frame) => {
  const pseudo_frame = START_PSEUDO_FRAME + frame;
  const framesPerDecisecond = FRAMES_PER_SECOND / 10;

  let totalDecisecondsSinceStart = pseudo_frame / framesPerDecisecond;

  const hoursSinceStart = Math.floor(totalDecisecondsSinceStart / (60 * 60 * 10));
  totalDecisecondsSinceStart %= (60 * 60 * 10);

  const minutesSinceStart = Math.floor(totalDecisecondsSinceStart / (60 * 10));
  totalDecisecondsSinceStart %= (60 * 10);

  const secondsSinceStart = Math.floor(totalDecisecondsSinceStart / 10);
  totalDecisecondsSinceStart %= 10;

  const decisecondsSinceStart = Math.floor(totalDecisecondsSinceStart);

  return `${hoursSinceStart.toString().padStart(2, '0')}:${minutesSinceStart.toString().padStart(2, '0')}:${secondsSinceStart.toString().padStart(2, '0')}.${decisecondsSinceStart}`;
};

const renderData = (fileName) => {
  const data = JSON.parse(fs.readFileSync(`./transformed/${fileName}`, { encoding: 'utf8' }));
  const keysToUse = Object.keys(data).filter((key) => key >= START_TIME && key <= END_TIME);

  let currentFrame = 0;
  let currentTime = `${START_TIME}`;
  let currentDataKey = keysToUse[0];
  let currentData = data[currentDataKey];
  let dataHasChanged = true;

  // removing first element from keysToUse since we're already using
  keysToUse.shift();

  let canvas = createCanvas(WIDTH, HEIGHT);
  let ctx = canvas.getContext('2d');

  const drawTextFromCenter = (text, x, y) => {
    const textMeausrement = ctx.measureText(text);

    const actualX = x - (textMeausrement.actualBoundingBoxRight) / 2;
    const actualY = y + ((textMeausrement.actualBoundingBoxAscent + textMeausrement.actualBoundingBoxDescent) / 2);

    ctx.fillText(text, actualX, actualY);
  };

  const convertHandlePositionsToWords = (rawHandle) => {
    let positionName = '';
    if (rawHandle < 9) positionName = 'Emergency';
    else if (rawHandle < 10) positionName = 'Max Brake';
    else if (rawHandle < 44) positionName = 'Braking';
    else if (rawHandle < 44) positionName = 'Min Brake';
    else if (rawHandle < 53) positionName = 'Coast';
    else if (rawHandle < 69) positionName = 'Min Power';
    else if (rawHandle < 87) positionName = 'Power';
    else positionName = 'Max Power';

    return positionName;
  };

  while (currentTime <= END_TIME) {
    //if (currentFrame > 1) break; // for dev, failsafe

    currentTime = calculateTimeForFrame(currentFrame);

    if (keysToUse[0] <= currentTime) { // if we should use the next data chunk
      currentDataKey = keysToUse.shift();
      currentData = data[currentDataKey];
      dataHasChanged = true;
    };

    if (dataHasChanged) {
      // background
      ctx.fillStyle = FOREGROUND_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(2, 2, canvas.width - 4, canvas.height - 4);

      // setting drawing colors and fonts
      ctx.strokeStyle = FOREGROUND_COLOR;
      ctx.fillStyle = FOREGROUND_COLOR;
      ctx.font = 'bold 30px Raleway';
      ctx.lineWidth = 2;

      // drawing out quadrants
      // top-down line
      ctx.beginPath();
      ctx.lineTo((canvas.width / 2) - 1, 0);
      ctx.lineTo((canvas.width / 2) - 1, canvas.height);
      ctx.stroke();

      // left-right line
      ctx.beginPath();
      ctx.lineTo(0, (canvas.height / 2) - 1);
      ctx.lineTo(canvas.width, (canvas.height / 2) - 1);
      ctx.stroke();

      // big numbers
      ctx.font = `bold ${canvas.height / 5.4}px sans-serif`;
      drawTextFromCenter(currentData.speed, (canvas.width / 4) * 1, ((canvas.height / 4) * 1) + (canvas.height / 54)); // speed
      drawTextFromCenter(currentData.traction_motor_current, (canvas.width / 4) * 3, ((canvas.height / 4) * 1) + (canvas.height / 54)); // traction_motor_current
      drawTextFromCenter(`${currentData.acceleration_and_brake_command}%`, (canvas.width / 4) * 3, ((canvas.height / 4) * 3) + (canvas.height / 54)); // acceleration_and_brake_command
      drawTextFromCenter(currentData.brake_cylinder_pressure, (canvas.width / 4) * 1, ((canvas.height / 4) * 3) + (canvas.height / 54)); // brake_cylinder_pressure

      // small text
      ctx.font = `bold ${canvas.height / 27}px sans-serif`;
      drawTextFromCenter('Speed (mph)', (canvas.width / 4) * 1, ((canvas.height / 4) * 1) - (canvas.height / 10.8)); // speed
      drawTextFromCenter('Traction Motor Current (amps)', (canvas.width / 4) * 3, ((canvas.height / 4) * 1) - (canvas.height / 10.8)); // traction_motor_current
      drawTextFromCenter('Controller Handle', (canvas.width / 4) * 3, ((canvas.height / 4) * 3) - (canvas.height / 10.8)); // acceleration_and_brake_command
      drawTextFromCenter(convertHandlePositionsToWords(currentData.acceleration_and_brake_command), (canvas.width / 4) * 3, ((canvas.height / 4) * 3) + (canvas.height / 8)); // acceleration_and_brake_command
      drawTextFromCenter('Brake Cylinder Pressure (psi)', (canvas.width / 4) * 1, ((canvas.height / 4) * 3) - (canvas.height / 10.8)); // brake_cylinder_pressure
    }

    const imageBuffer = canvas.toBuffer('image/jpeg', { quality: 0.5 });
    fs.writeFileSync(`./rendered/${fileName.split('.')[0]}/${currentFrame.toString().padStart(5, '0')}.jpg`, imageBuffer);

    //if (currentFrame % 25 == 0) console.log(currentFrame, currentTime, currentData.speed, currentData.traction_motor_current, currentData.acceleration_and_brake_command, currentData.brake_cylinder_pressure)
    if (currentFrame % 30 == 0) console.log(currentFrame, currentTime);

    dataHasChanged = false;
    currentFrame++; // next frame
  };
};

filesToProcess.forEach((file) => {
  fs.mkdirSync(`./rendered/${file.split('.')[0]}`);
  renderData(file);
});