// @ts-ignore
const crypto = require('crypto');

if (!global.crypto) {
  // @ts-ignore
  global.crypto = {
    randomUUID: crypto.randomUUID,
  };
}
