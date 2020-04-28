let express = require('express');
let socket = require('socket.io');
let app = express();
let http = require('http');
let server = http.createServer(app);
let io = socket(server);
//let bodyParser = require('body-parser')
const {Blockchain, Transaction} = require('./blockchain.js');
const fs = require('fs');
let coin = null;

if(fs.existsSync('chain.json')){
    coin = fs.readFileSync('chain.json');
    let json = JSON.parse(coin);
    coin = new Blockchain(json);
}
else{
    coin = new Blockchain();
    fs.writeFileSync('chain.json', JSON.stringify(coin,null,4));
}

app.use('/', express.static(__dirname))

io.on('connection', (socket)=>{
    console.log('[+] Connection recieved: ' + socket.id);

    socket.on('transaction',  (tx)=>{
        let transaction = new Transaction();
        transaction.import(tx);
        console.log('[+] Transaction recieved for ' + transaction.amount);
        if(transaction.isValid()){
            console.log('[+] Transaction validated');      
            coin.addTransaction(transaction);
            fs.writeFileSync('chain.json', JSON.stringify(coin,null,4));
            socket.emit('message', '[+] Your transaction was successfully recieved');
        }
        else{
            console.log('[-] This transaction is invalid');
            socket.emit('message', '[-] Your transaction was invalid');
        }
        
        io.emit('update', coin);
    });

    socket.on('mine',  ()=>{
        socket.emit('miner', coin);
    });

    socket.on('enough', (data)=>{
        if(coin.getBalance(data.address) > data.amount){
            socket.emit('enough', true)
        }
        else {
            socket.emit('enough', false)
        }
    })

    socket.on('balance', (address)=>{
        socket.emit('message','Balance: ' + coin.getBalance(address).toFixed(coin.decimals)+ ' ' + coin.icon +
        '\nPending: ' + coin.getPendingBalance(address).toFixed(coin.decimals) + ' ' + coin.icon)
    });

    socket.on('reward', (data)=>{
        console.log('[+] Block mined at: ' + data.hash);
        coin = new Blockchain(data.blk);
        fs.writeFileSync('chain.json', JSON.stringify(coin,null,4));
        socket.broadcast.emit('update',"[+] Block mined at: " + data.hash);
        if(coin.isChainValid()){
            console.log('[+] Blockchain validated');
        }
        else{
            console.log('[!] Blockchain has become corrupted!');
        }        
        socket.emit('miner',coin);
    })
});


server.listen(3000, ()=>{
    console.log('[!] listening on port 3000...');
})


//console.log('balance of my wallet', coin.getBalance(wallet));

//console.log('Valid?', coin.isChainValid());


