import express from 'express';
import morgan from 'morgan';
import moment from 'moment';
import * as socketio from 'socket.io';
import * as path from 'path';

import * as db from './db';
// import * as io from './io';

// (async function() {
//   const result = await db.Order.findAll({ raw: true });
//   console.log(result);
// })();

const app = express();

// morgan for logging
morgan.token('date', function() { return moment().format('DD/MM/YYYY HH:mm:ss'); });
app.use(morgan(':remote-addr - :remote-user [:date] :method :url :status - :response-time ms'));

// serve static files
app.use(express.static(path.join(__dirname, '../client'), { index: false, extensions:['html'] }));

var http = require('http').createServer(app);

const WS_PORT = 3000;

http.listen(WS_PORT, function() {
  console.log(`WebSocket is listening on *:${WS_PORT}`);
});

var io = require('socket.io')(http);
const order_io = io.of('/order');
const bartender_io = io.of('/bartender');
const cashier_io = io.of('/cashier');
const summary_io = io.of('/summary');

order_io.on('connection', function(socket: any) {
  socket.on('new', function(order_info: any) {

    db.Order.create({
      mixture: parseInt(order_info.mixture),
      randomized_by_user: false,
      finished_by_bartender: false,
      paid: false,
      played_by_dj: false,
    })
    .then((result: any) => {
      if(result)
        bartender_io.emit('new', { id: result.id, ...order_info });
    });
  });
});

bartender_io.on('connection', function(socket: any) {

  db.Order.findAll({
    where: {
      finished_by_bartender: false,
    },
    order: [
      ['updatedAt', 'ASC'],
    ],
    raw: true,
  })
  .then((result: any) => {
    socket.emit('remain', result);
  });

  socket.on('finish', function(id: any) {
    db.Order.update(
      { finished_by_bartender: true },
      { where: { id: id } },
    )
    .then(async () => {
      socket.emit('finished', id);

      db.Order.findOne({
        where: { id: id },
      })
      .then((result: any) => {
        cashier_io.emit('new', result);
      });
    });
  });
});

cashier_io.on('connection', function(socket: any) {

  db.Order.findAll({
    where: {
      finished_by_bartender: true,
      paid: false,
    },
    order: [
      ['updatedAt', 'ASC'],
    ],
    raw: true,
  })
  .then((result: any) => {
    socket.emit('remain', result);
  });

  socket.on('pay', function(id: any) {
    db.Order.update(
      { paid: true },
      { where: { id: id } },
    )
    .then(() => {
      socket.emit('paid', id);

      db.Order.findOne({
        where: { id: id },
      })
      .then((result: any) => {
        summary_io.emit('new', result);
      });
    });
  });
});


summary_io.on('connection', function(socket: any) {

  db.Order.findAll({
    where: {
      finished_by_bartender: true,
      paid: true,
    },
    order: [
      ['updatedAt', 'ASC'],
    ],
    raw: true,
  })
  .then((result: any) => {
    socket.emit('remain', result);
  });
});