import fs from 'fs';

const filesToProcess = fs.readdirSync('./raw_parsed');

if (fs.existsSync('./transformed')) fs.rmSync('./transformed', { recursive: true, force: true });
fs.mkdirSync('./transformed');

const keyTransforms = {
  'EVT': 'evt', // no fucking clue, i believe some sort of change signifier
  'SPD': 'speed',
  'BCP': 'brake_cylinder_pressure',
  'EPP': 'emergency_pipe_pressure',
  'HLV': 'headlight_voltage',
  'BTV': 'battery_voltage',
  'TMC': 'traction_motor_current',
  'PWM': 'acceleration_and_brake_command',
  'PWR': 'power_trainline',
  'DOR': 'door_closed_indicator',
  'TRL': 'this_cab_trailing',
  'PBK': 'parking_brake',
  'FWD': 'forward',
  'REV': 'reverse',
  'SNW': 'snow_brake',
  'BPD': 'bridge_plate_deployed',
  'RST': 'manual_alerter_reset',
  'HRN': 'horn',
  'WHE': 'wheel_slip',
  'REL': 'brakes_released',
  'MCE': 'master_control_enable',
  'BEL': 'bell',
  'PEN': 'no_alerter_penalty',
  'OVR': 'ers_tms_override_switch',
  'BTE': 'bench_test_enabled',
  'DLC': 'ditch_light_switch_on_continuous',
  'DLF': 'ditch_light_switch_flash',
  'DLA': 'ditch_light_switch_auto',
  'HFP': 'horn_foot_pedal',
  'OSP': 'overspeed',
}

const rowDefaultValues = {
  'evt': false,
  'speed': null,
  'brake_cylinder_pressure': null,
  'emergency_pipe_pressure': null,
  'headlight_voltage': null,
  'battery_voltage': null,
  'traction_motor_current': null,
  'acceleration_and_brake_command': null,
  'power_trainline': false,
  'door_closed_indicator': false,
  'this_cab_trailing': false,
  'parking_brake': false,
  'forward': false,
  'reverse': false,
  'snow_brake': false,
  'bridge_plate_deployed': false,
  'manual_alerter_reset': false,
  'horn': false,
  'wheel_slip': false,
  'brakes_released': false,
  'master_control_enable': false,
  'bell': false,
  'no_alerter_penalty': false,
  'ers_tms_override_switch': false,
  'bench_test_enabled': false,
  'ditch_light_switch_on_continuous': false,
  'ditch_light_switch_flash': false,
  'ditch_light_switch_auto': false,
  'horn_foot_pedal': false,
  'overspeed': false,
}

for (let i = 0; i < filesToProcess.length; i++) {
  const unprocessed = JSON.parse(fs.readFileSync(`./raw_parsed/${filesToProcess[i]}`, { encoding: 'utf8' }));

  let dataPoints = {};

  for (let j = 0; j < unprocessed.pages.length; j++) {
    const lines = unprocessed.pages[j];
    const sortedLines = Object.keys(lines).sort((a, b) => Number(b) - Number(a));

    let topKeysLineIndex = 0;
    let topKeys = [];
    let topKeysDict = {};
    let topKeysDictKeys = null;
    let currentlyProcessingTopKeys = false;
    let currentlyProcessingData = false;

    for (let k = 0; k < sortedLines.length; k++) {
      const line = lines[sortedLines[k]];
      const sortedLineKeys = Object.keys(line).sort((a, b) => Number(a) - Number(b));
      const sortedLine = sortedLineKeys.map((key) => line[key]);

      // checking for the start of the top keys
      if (sortedLine[0].startsWith('Unit #')) currentlyProcessingTopKeys = true;

      if (currentlyProcessingTopKeys) {
        if (topKeysLineIndex == 0) {
          sortedLineKeys.shift(); // first element is the unit number, which we don't need
          sortedLine.shift();
          topKeys.push(...sortedLineKeys.map((location) => [location]));
        }

        sortedLine.forEach((char, charIndex) => {
          topKeys[charIndex].push(char)
        })

        topKeysLineIndex++;
        if (topKeysLineIndex > 2) {
          currentlyProcessingTopKeys = false;
          topKeys.forEach((key) => {
            topKeysDict[key[0]] = key.slice(1).join('');
          });
          topKeysDictKeys = Object.keys(topKeysDict).map((n) => Number(n));
        }
      }

      // checking for the start of the data 
      // NOTE: THIS IS DATE SPECIFIC - WILL NEED TO CHANGE IN THE FUTURE TO REGEX
      if (sortedLine[0].startsWith('2023/10/29')) {
        currentlyProcessingData = true;
        continue;
      }

      if (currentlyProcessingData) {
        let dontSaveRow = false;
        let lineKey = null;
        let lineData = { ...rowDefaultValues };
        sortedLineKeys.forEach((key, lineTokenIndex) => {
          if (lineTokenIndex == 0) lineKey = line[key].split(' ')[1];
          else {
            if (line[key] == ' ') return; // empty
            if (line[key].startsWith('Zero Speed Record')) dontSaveRow = true; // no actual data on this line

            const closestIndexToColumn = topKeysDictKeys.reduce((prev, curr) => {
              return (Math.abs(curr - key) < Math.abs(prev - key) ? curr : prev);
            });

            const lineValue = isNaN(line[key]) ? !!line[key] : Number(line[key]);

            lineData[keyTransforms[topKeysDict[closestIndexToColumn]]] = lineValue;
          }
        });

        if (!dontSaveRow) dataPoints[lineKey] = lineData;
      }
    }
    if (j % 25 == 0) console.log(`Done with page ${j + 1}/${unprocessed.pages.length} (${((j / unprocessed.pages.length) * 100).toFixed(2)}%)`)
  }

  console.log(`Done with ${filesToProcess[i]}`)
  fs.writeFileSync(`./transformed/${filesToProcess[i]}`, JSON.stringify(dataPoints, null, 2), { encoding: 'utf8' });
};