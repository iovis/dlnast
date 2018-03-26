const fs = require('fs');
const mime = require('mime');
const path = require('path');

module.exports = (file) => {
  if (!fs.existsSync(file)) return;

  const extension = path.extname(file);

  return {
    path: file,
    mime: mime.getType(file),
    extension,
    basename: path.basename(file, extension),
    size: fs.statSync(file).size
  };
};
