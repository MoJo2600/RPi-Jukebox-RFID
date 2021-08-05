import { v4 as uuidv4 } from 'uuid';
import * as zmq from 'jszmq';

import { PUBSUB_ENDPOINT, REQRES_ENDPOINT } from '../config';
import { socketEvents } from './events';
import {
  decodeMessage,
  encodeMessage,
  preparePayload
} from './utils';

const SUBSCRIPTIONS = ['playerstatus'];

const socket_sub = new zmq.Sub();

SUBSCRIPTIONS.forEach(
  (topic) => socket_sub.subscribe(topic)
);

socket_sub.connect(PUBSUB_ENDPOINT);

const initSockets = ({ setState }) => {
  socketEvents({ setState });
};

// const socketRequest = (payload) => (
const socketRequest = (_package, method, kwargs, plugin = 'ctrl') => (
  new Promise((resolve, reject) => {
    const requestId = uuidv4();

    socketRequest.server = zmq.socket('req');

    socketRequest.server.on('message', (msg) => {
      const { id, error, result } = decodeMessage(msg);

      if (error && error.message) {
        return reject(error.message);
      }

      socketRequest.server.close();

      if (id && id === requestId) {
        return resolve(result);
      }
      else {
        return reject('Received socket message ID does not match sender ID.');
      }
    });

    socketRequest.server.onerror = function (err) {
      socketRequest.server.close();
      console.error('socket connection error: ', err);
      reject(err);
    };

    socketRequest.server.connect(REQRES_ENDPOINT);

    const payload = preparePayload(
      _package,
      method,
      kwargs,
      requestId,
      plugin,
    );
    socketRequest.server.send(encodeMessage(payload));
  })
);

export {
  socket_sub,
  socketRequest,
  initSockets,
};

