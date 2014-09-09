// Copyright 2014 The Chromium Authors. All rights reserved.

// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file or at
// https://developers.google.com/open-source/licenses/bsd

'use strict';

var util = require('../../../shared/util');

/**
 * Responds to a request to truncate the contents of a file.
 * @param {Object} options Input options.
 * @param {function} onSuccess Function to be called if the file was
 *     read successfully.
 * @param {function} onError Function to be called if an error occured while
 *     attempting to read the file.
 */
var onTruncateFileRequested = function(options, onSuccess, onError) {
  // Strip the leading slash, since not used internally.
  var path = options.filePath.substring(1);

  var readParameters = s3fs.parameters({
    Key: path
  });

  s3fs.s3.getObject(readParameters, function(error, data) {
    if (error) {
      // TODO(lavelle): add logic for returning more specific error codes.
      onError('FAILED');
    } else {
      var buffer = data.Body.toArrayBuffer();

      var write = function(data) {
        var writeParameters = s3fs.parameters({
          Key: path,
          Body: data,
          ContentLength: data.byteLength
        });

        s3fs.s3.putObject(writeParameters, function(error) {
          if (error) {
            onError('FAILED');
          } else {
            onSuccess();
          }
        });
      };

      if (options.length < buffer.byteLength) {
        // Truncate.
        write(buffer.slice(0, options.length));
      } else {
        // Pad with null bytes.
        var diff = options.length - buffer.byteLength;
        var blob = new Blob([buffer, new Array(diff + 1).join('\0')]);
        util.blobToArrayBuffer(blob, write);
      }
    }
  });
};

module.exports = onTruncateFileRequested;
