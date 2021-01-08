require('dotenv').config()
const line = require('@line/bot-sdk');
const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors')

const Datastore = require('nedb')
    , db = new Datastore({ filename: 'users.db', autoload: true });

const CronJob = require('cron').CronJob;
const job = new CronJob({
    cronTime: '00 00 00 * * *', // reset on 00:00 everyday
    onTick: function () {
        db.find({}, (err, docs) => {
            for (let user of docs) {
                db.update({ _id: user._id }, { displayName: user.displayName, status: 0 }, {}, function (err, _docs) {
                    console.log(_docs)
                });
            }
        })
    },
    start: false,
    timeZone: 'Asia/Bangkok'
});
job.start()

const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const PORT = process.env.PORT || 4000

const client = new line.Client(config);

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json({ extended: false }))
app.use(cors({ origin: true }))

app.post('/webhook', (req, res) => {
    let events = req.body.events
    console.log(events)
    reply(events)
    res.sendStatus(200)
})

app.listen(PORT, () => {
    console.log('listening in port', PORT)
})

async function reply(events) {
    if (events.length) {
        events = events[0]
        let userId = events.source.userId
        let groupId = events.source.groupId
        let _profile = await profile(groupId, userId)
        let displayName = _profile.displayName
        if (events.message.text === 'บอท') {
            client.replyMessage(events.replyToken, {
                type: 'template',
                altText: 'ระบบเช็คชื่อ',
                template: {
                    type: 'buttons',
                    thumbnailImageUrl: "https://sites.google.com/site/jibpiiz1015/_/rsrc/1459345484303/rabb-chekh-chux/%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A%E0%B9%80%E0%B8%8A%E0%B9%87%E0%B8%84%E0%B8%8A%E0%B8%B7%E0%B9%88%E0%B8%AD.jpg",
                    title: 'ระบบเช็คชื่อ',
                    text: 'รายชื่อระบบ',
                    actions: [
                        { label: 'ลงทะเบียนผู้ใช้', type: 'message', text: 'ลงทะเบียนผู้ใช้' },
                        { label: 'เช็คชื่อ', type: 'message', text: 'เช็คชื่อ' },
                        { label: 'รายชื่อคนเข้างานแล้ว', type: 'message', text: 'รายชื่อคนเข้างานแล้ว' },
                        { label: 'รายชื่อคนยังไม่เข้างาน', type: 'message', text: 'รายชื่อคนยังไม่เข้างาน' },
                    ],
                },
            });
        }
        else if (events.message.text === 'ลงทะเบียนผู้ใช้' || events.message.text === '000') {
            db.insert([{ _id: userId, displayName: displayName, status: 0 }], function (err, newDocs) {
                if (newDocs) {
                    let echo = { type: 'text', text: `${displayName} ทะเบียนเรียบร้อยแล้ว` };
                    client.replyMessage(events.replyToken, echo);
                }
                else {
                    let echo = { type: 'text', text: `${displayName} เคยลงทะเบียนไปแล้ว` };
                    client.replyMessage(events.replyToken, echo);
                }
            });
        }
        else if (events.message.text === 'เช็คชื่อ' || events.message.text === '111') {
            db.update({ _id: userId }, { displayName: displayName, status: 1 }, {}, function (err, numReplaced, upsert) {
                if (numReplaced) {
                    let echo = { type: 'text', text: `${displayName} เช็ดชื่อเรียบร้อยแล้ว` };
                    client.replyMessage(events.replyToken, echo);
                }
                else {
                    let echo = { type: 'text', text: `${displayName} ไม่พบผู้ใช้` };
                    client.replyMessage(events.replyToken, echo);
                }
            });
        }
        else if (events.message.text === 'รายชื่อคนเข้างานแล้ว' || events.message.text === '222') {
            db.find({ status: 1 }, function (err, docs) {
                let namelist = ""
                if (docs.length) {
                    for (let user of docs) {
                        namelist = namelist + user.displayName + ","
                    }
                    namelist = namelist.substring(0, namelist.length - 1)
                    let echo = { type: 'text', text: `รายชื่อคนที่เข้างานทั้งหมด: ${namelist}` };
                    client.replyMessage(events.replyToken, echo);
                }
                else {
                    let echo = { type: 'text', text: `ยังไม่มีคนเข้างาน` };
                    client.replyMessage(events.replyToken, echo);
                }
            });
        }
        else if (events.message.text === 'รายชื่อคนยังไม่เข้างาน' || events.message.text === '333') {
            db.find({ status: 0 }, function (err, docs) {
                let namelist = ""
                if (docs.length) {
                    for (let user of docs) {
                        namelist = namelist + user.displayName + ","
                    }
                    namelist = namelist.substring(0, namelist.length - 1)
                    let echo = { type: 'text', text: `รายชื่อคนที่ยังไม่เข้างานทั้งหมด: ${namelist}` };
                    client.replyMessage(events.replyToken, echo);
                }
                else {
                    db.find({}, (err, docs) => {
                        if (docs.length) {
                            let echo = { type: 'text', text: `เข้างานครบทุกคนแล้ว` };
                            client.replyMessage(events.replyToken, echo);
                        }
                        else {
                            let echo = { type: 'text', text: `ยังไม่มีผู้ลงทะเบียนใช้งาน` };
                            client.replyMessage(events.replyToken, echo);
                        }

                    })
                }
            });
        }
    }
    else console.log('no events')
}

function profile(groupId, userId) {
    return client.getGroupMemberProfile(groupId, userId)
}