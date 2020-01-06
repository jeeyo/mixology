import express from 'express';
import morgan from 'morgan';
import moment, { Moment } from 'moment';
import * as path from 'path';

import * as db from './db';

const WS_HOST = 'localhost';
const WS_PORT = 3000;

const app = express();

// morgan for logging
morgan.token('date', function() { return moment().format('DD/MM/YYYY HH:mm:ss'); });
app.use(morgan(':remote-addr - :remote-user [:date] :method :url :status - :response-time ms'));

// serve static files
app.use(express.static('static'));

// hogan for templating
app.set('views', 'views');
app.set('view engine', 'hjs');

function serveTemplate(req: express.Request, res: express.Response) {
  const view = req.path.slice(1);
  return res.render(view, { host: WS_HOST, port: WS_PORT });
}

app.get('/order', serveTemplate);
app.get('/bartender', serveTemplate);
app.get('/cashier', serveTemplate);
app.get('/summary', serveTemplate);
app.get('/dj_odd', serveTemplate);
app.get('/dj_even', serveTemplate);

var http = require('http').createServer(app);

http.listen(WS_PORT, function() {
  console.log(`WebSocket is listening on *:${WS_PORT}`);
});

var battle_start_time: Moment = null;

var io = require('socket.io')(http);
const order_io = io.of('/order');
const bartender_io = io.of('/bartender');
const cashier_io = io.of('/cashier');
const summary_io = io.of('/summary');
const dj_odd = io.of('/dj_odd');
const dj_even = io.of('/dj_even');

/* Order */
order_io.on('connection', function(socket: any) {
  socket.on('new', function(order_info: any) {
    db.Order.create({
      mixture: parseInt(order_info.mixture),
      randomized_by_user: false,
      finished_by_bartender: false,
      paid: false,
      played_by_dj: false,
      time: moment().format('YYYY-MM-DD HH:mm:ss'),
    })
    .then((result: any) => {
      if(result)
        bartender_io.emit('new', { id: result.id, ...order_info });
    });
  });
});

/* Bartender */
bartender_io.on('connection', function(socket: any) {
  db.Order.findAll({
    where: {
      finished_by_bartender: false,
    },
    order: [
      ['time', 'ASC'],
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

/* Cashier */
cashier_io.on('connection', function(socket: any) {
  db.Order.findAll({
    where: {
      finished_by_bartender: true,
      paid: false,
    },
    order: [
      ['time', 'ASC'],
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

        if(battle_start_time != null)
          id % 2 == 0 ? dj_even.emit('new', result) : dj_odd.emit('new', result);
      });
    });
  });
});

/* Summary */
summary_io.on('connection', function(socket: any) {
  db.Order.findAll({
    where: {
      finished_by_bartender: true,
      paid: true,
    },
    order: [
      ['time', 'ASC'],
    ],
    raw: true,
  })
  .then((result: any) => {
    socket.emit('remain', { battle_start_time: battle_start_time, remaining: result });
  });

  socket.on('battle', function() {
    battle_start_time = moment();
    socket.emit('battling', null);
    dj_odd.emit('battling', null);
    dj_even.emit('battling', null);
  });

  socket.on('end', function() {
    battle_start_time = null;
    socket.emit('ended', null);
    dj_odd.emit('ended', null);
    dj_even.emit('ended', null);
  });
});

/* DJ Odd */
dj_odd.on('connection', function(socket: any) {

  if(battle_start_time == null)
    return socket.emit('remain', []);

  db.Order.findAll({
    where: db.sequelize.and(
      db.sequelize.literal('id % 2 <> 0'),
      { finished_by_bartender: true },
      { paid: true },
      { played_by_dj: false },
      db.sequelize.where(db.sequelize.col('time'), '>=', battle_start_time.format('YYYY-MM-DD HH:mm:ss')),
    ),
    order: [
      ['time', 'ASC'],
    ],
    raw: true,
  })
  .then((result: any) => {
    socket.emit('remain', result);
  });

  socket.on('play', function(id: any) {
    db.Order.update(
      { played_by_dj: true },
      { where: { id: id } },
    )
    .then(() => {
      socket.emit('played', id);

      db.Order.findOne({
        where: { id: id },
      })
    });
  });
});

/* DJ Even */
dj_even.on('connection', function(socket: any) {

  if(battle_start_time == null)
    return socket.emit('remain', []);

  db.Order.findAll({
    where: db.sequelize.and(
      db.sequelize.literal('id % 2 == 0'),
      { finished_by_bartender: true },
      { paid: true },
      { played_by_dj: false },
      db.sequelize.where(db.sequelize.col('time'), '>=', battle_start_time.format('YYYY-MM-DD HH:mm:ss')),
    ),
    order: [
      ['time', 'ASC'],
    ],
    raw: true,
  })
  .then((result: any) => {
    socket.emit('remain', result);
  });

  socket.on('play', function(id: any) {
    db.Order.update(
      { played_by_dj: true },
      { where: { id: id } },
    )
    .then(() => {
      socket.emit('played', id);

      db.Order.findOne({
        where: { id: id },
      })
    });
  });
});