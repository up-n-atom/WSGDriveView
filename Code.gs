function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate();
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/*
    Folders are publicly shared from Google Drive. Each generation
    is split into their own folder containing the big-endian dumps
    saved as S/N.bin. Change IDs to match your personal GDrive folders.
*/
function getWsEepromFolder() {
  return DriveApp.getFolderById('1DW4AcdP1x_LTwfoGKWaFSV8wSEExwdjo');
}

function getWscEepromFolder() {
  return DriveApp.getFolderById('1MgEtN7YfBSt8nFUrK6iUbCM-uNwjRygz');
}

function getScEepromFolder() {
  return DriveApp.getFolderById('111Afu_iLc5FHRnAV7M8E0q79y_v3ipC4');
}

function getNg400mEepromFolder() {
  return DriveApp.getFolderById('1m88-j63g3slJyB6ioJnYMP9bOaXK6-IQ');
}

function getEepromFilesFromFolder(folder, filterSize) {
  const files = folder.getFiles();
  var index = 0;
  var eepromFiles = new Array();
  
  while (files.hasNext()) {
    var file = files.next();
    
    if (file.getSize() == filterSize && file.getName().slice(-3) == 'bin')
      eepromFiles.push(file);
  }
  
  eepromFiles.sort();
  
  const eepromFileIterator = {
    hasNext: function() {
      return index < eepromFiles.length;
    },
    next: function() {
      return eepromFiles[index++];
    }
  };
  
  return eepromFileIterator;
}

function getWsEepromFiles() {
  return getEepromFilesFromFolder(getWsEepromFolder(), 128);
}

function getWscEepromFiles() {
  return getEepromFilesFromFolder(getWscEepromFolder(), 2048);
}

function getScEepromFiles() {
  return getEepromFilesFromFolder(getScEepromFolder(), 2048);
}

function getNg400mEepromFiles() {
  return getEepromFilesFromFolder(getNg400mEepromFolder(), 2048);
}

function createListingTemplate(type, files)
{
  const template = HtmlService.createTemplateFromFile('template');
  template.name = new String(type);
  template.data = files;
  return template.evaluate().getContent();
}

function listEepromFiles(type) {
  var files = null;
  
  switch (type) {
    case 'WonderSwan':
      files = getWsEepromFiles();
      break;
    case 'WonderSwanColor':
      files = getWscEepromFiles();
      break;
    case 'SwanCrystal':
      files = getScEepromFiles();
      break;
    case 'NaviGet400Million':
      files = getNg400mEepromFiles();
      break;
    default:
      files = null;
  }
  
  if (!files)
    throw new Error('No files found.');
  
  return createListingTemplate(type, files);
}

function toUnsignedByte(x) {
  return (x >>> 0) & 0xff;
}

function sum(total, num) {
  return total += num;
}

String.prototype.replaceAt=function(index, replacement) {
    return this.substr(0, index) + replacement+ this.substr(index + replacement.length);
}

function parseWsEepromFile(file) {
  if (!file)
    throw new Error('Invalid file ID.');

  var eeprom = file.getBlob().getBytes();
  
  const publisher = [
    '???',
    'BAN', /* Bandai */
    'TAT', /* Taito */
    'TMY', /* Tomy */
    'KEX', /* Koei */
    'DTE', /* Data East */
    'AAE', /* Asmik Ace */
    'MDE', /* Media Entertainment */
    'NHB', /* Nichibutsu */
    '???',
    'CCJ', /* Coconuts Japan */
    'SUM', /* Sammy */
    'SUN', /* Sun Soft */
    'PAW', /* */
    'BPR', /* Banpresto */
    '???',
    'JLC', /* Jaleco */
    'MGA', /* Imagineer */
    'KNM', /* Konami */
    '???',
    '???',
    '???',
    'KBS', /* Kobunsha */
    'BTM', /* Bottom Up */
    'KGT', /* Kaga Tech */
    'SRV', /* Sunrise */
    'CFT', /* Cyber Front */
    'MGH', /* Mega House */
    '???',
    'BEC', /* Interbec */
    'NAP', /* Nihon Application */
    'BVL', /* Bandai Visual */
    'ATN', /* Athena */
    'KDX', /* KID */
    'HAL', /* HAL Corporation */
    'YKE', /* Yuki Enterprise */
    'OMN', /* Omega Micott */
    'LAY', /* Layup */
    'KDK', /* Kadokawa Shoten */
    'SHL', /* Shall Luck */
    'SQR', /* Squaresoft */
    '???',
    '???',
    'TMC', /* Tom Create */
    '???',
    'NMC', /* Namco */
    'SES', /* */
    'HTR', /* */
    '???',
    'VGD', /* Vanguard */
    'MGT', /* Megatron */
    'WIZ', /* Wiz */
    '???',
    'TAN', /* Tanita */
    'CAP'  /* Capcom */
  ];
  
  const gender = [
    '?',
    'MALE',
    'FEMALE'
  ];
  
  const bloodType = [
    '?',
    'A',
    'B',
    'O',
    'AB'
  ];
  
  /* Convert from big to little endian
     16-bit EEPROM - swap bytes and convert to unsigned */
  for (var i = 0; i < eeprom.length; i += 2) {
    eeprom[i] = toUnsignedByte(eeprom[i] ^ eeprom[i + 1]);
    eeprom[i + 1] = toUnsignedByte(eeprom[i + 1]) ^ eeprom[i];
    eeprom[i] ^= eeprom[i + 1];
  }
  
  const saveSum = eeprom.slice(0, 95).reduce(sum, 0);
  
  const name = eeprom.slice(96, 112).map(function(c) {
    if (!c) // Space
      return 32;
    else if (c > 0 && c < 11) // 0-9
      return c + 47;
    else if (c > 10 && c < 37) // A-Z
      return c + 54;
    else if (c > 36 && c < 43) {
      const specialChars = [
        0x2665, // Heart
        0x266A, // Eighth Note
        43,     // + 
        45,     // -
        63,     // ?
        46      // .
      ];
      return specialChars[c - 37];
    } else
      return 95; // Bad dump? - low line
  });
  
  const publisherId = eeprom[118] > publisher.length ? 0 : eeprom[118];
  
  const year = parseInt(((eeprom[112] << 8) | eeprom[113]).toString(16));
  const month = parseInt(eeprom[114].toString(16));
  const day = parseInt(eeprom[115].toString(16));
  
  var cartId = publisherId == 0 ? "" : "SWJ-" + publisher[publisherId] + String("000" + eeprom[120]).slice(-3);
  
  if (cartId.length && eeprom[119])
    cartId = cartId.replaceAt(7, 'C');
  
  return [
    file.getId(),
    /* Name */
    String.fromCharCode.apply(null, name),
    /* Date of Birth */
    String("0000" + year.toString()).slice(-4) + "-" + String("00" + month.toString()).slice(-2) + "-" + String("00" + day.toString()).slice(-2),
    /* Gender */
    gender[eeprom[116] > gender.length ? 0 : eeprom[116]],
    /* Blood type */
    bloodType[eeprom[117] > bloodType.length ? 0 : eeprom[117]],
    /* Publisher ID */
    String("00" + publisherId.toString(16).toUpperCase()).slice(-2),
    /* Game ID */
    String("00" + eeprom[120].toString().toUpperCase()).slice(-2),
    /* Cartridge ID */
    cartId,
    /* Swan ID */
    String("00" + eeprom[123].toString(16).toUpperCase()).slice(-2) + String("00" + eeprom[122].toString(16).toUpperCase()).slice(-2),
    /* Save count */
    eeprom[125],
    /* Cart count */
    eeprom[124],
    /* Boot count */
    (eeprom[127] << 8) | eeprom[126],
    /* Volume */
    eeprom[131] & 3,
    /* Constrast */
    (eeprom[131] & 64) >> 6
  ];
}

function parseWsEepromFileByFileId(fileId) {
  return parseWsEepromFile(DriveApp.getFileById(fileId));
}

function parseWscEepromFileByFileId(fileId) {
  return parseWsEepromFileByFileId(fileId);
}

function parseScEepromFileByFileId(fileId) {
  return parseWscEepromFileByFileId(fileId);
}