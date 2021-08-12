const express = require('express');
const { v4 } = require('uuid')
var app = express()

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const channels = new Map()
function sendEvent(res, msg){
    res.write(`data:${msg}\n\n`) //在页面的 onmessage 接收的话需要 data: 开头 每个消息\n\n结尾
}

function pushToClients(msg, channel){
    channel.forEach(res=>{
        sendEvent(res, msg)
    })
}
function getChannel(req){
    //取请求的频道，如无提供则为 default
    let channel = req.params.channel || 'default'
    //频道是否已在，不在则新建，用Map存，为了后面删除。
    if(!channels.get(channel)){
        channels.set(channel, new Map())
    }
    //返回名字（用于console.log显示名字)， 频道的Map
    return [channel, channels.get(channel)]
}
async function send(req, res, next){
    const [chlname, channel] = getChannel(req) //取频道名字和Map() uuid对应 res
    const msg = req.body.message
    if(msg){
        res.send({code:0, msg:'ok'})
        pushToClients(msg, channel)
    } else {
        res.send({code:1, msg:'请提供 {"messgae": "hello"}'})
    }
}
async function sse(req, res, next){
    const [chlname, channel] = getChannel(req)
    res.set('Access-Control-Allow-Origin', '*'); //允许跨域
    res.set('Content-Type', 'text/event-stream')
    res.set('Cache-Control', 'no-cache')
    res.set('Connection', 'keep-alive')
    const uuid = v4() //生成一个uuid(唯一)
    channel.set(uuid, res)
    console.log('channel [' + chlname + '] ok, size: [' + channel.size + ']', 'connected')
    sendEvent(res, 'connected')
    res.on('close', ()=>{
        channel.delete(uuid) 
        console.log(`${chlname} client close ${uuid}, size: ${channel.size}`)
    })
}
app.get('/sse/:channel(\\w+)', sse)
app.get('/sse', sse)

app.post('/send/:channel(\\w*)', send)
app.post('/send', send)

module.exports = app;
