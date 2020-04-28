const EC = require('elliptic').ec
const ec = new EC('secp256k1');
const fs = require('fs');
const {Blockchain, Transaction} = require('./blockchain.js');

const io = require('socket.io-client');
let socket = io('http://127.0.0.1:3000');

socket.on('message', (msg) => {
    console.log(msg);
    process.exit();
})

socket.on('update', (msg)=>{
    console.log(msg);
})

socket.on('miner', (chain)=>{
    let wallet = readKeys();
    let blk = new Blockchain(chain);
    let time = 0;
    while(blk.pendingBlock.hash.substring(0, blk.difficulty) !== Array(blk.difficulty + 1).join('0')){
        blk.pendingBlock.nonce++;
        time++;
        blk.pendingBlock.hash = blk.pendingBlock.calculateHash();
        if(time> 10000){
            time = 0;
            break;
        }
    }
    if(blk.pendingBlock.hash.substring(0, blk.difficulty) !== Array(blk.difficulty + 1).join('0')){
        socket.emit('mine');
    }
    else{
        let hash = blk.pendingBlock.hash
        console.log("[!] You mined a block at: " + blk.pendingBlock.hash);
        blk.sendHash(wallet);    
        socket.emit('reward',{blk: blk, hash: hash});
    }
});

let command = process.argv[2];

if(command == 'mine'){
    socket.emit('mine');  
}
else if(command == 'keygen'){
    const key = ec.genKeyPair();
    const publickey = key.getPublic('hex');
    const privatekey = key.getPrivate('hex');
    const loc = __dirname + '/keys.json'

    const json = {private: privatekey, public: publickey};
    fs.writeFileSync('keys.json', JSON.stringify(json,null,4));
    console.log('\nPrivate key:', privatekey);
    console.log('Public key:', publickey);
    console.log('\nKeys written to: ' + loc);

    process.exit();
}
else if(command == 'send'){
    let wallet = readKeys();
    let to = process.argv[process.argv.indexOf('-r') + 1];
    let amount = process.argv[process.argv.indexOf('-a') + 1];
    const tx = new Transaction(wallet, to, amount);
    tx.signTransaction(getSignature());
    socket.emit('transaction', tx);
}
else if(command == 'balance'){
    let wallet = readKeys();
    socket.emit('balance', wallet);
}
else{
    console.log('Please enter a valid command.')
    console.log('Usage: node client [action]')
    console.log('action: <keygen> <send> <balance> <mine>')
    process.exit();
}

function readKeys(){
    if(fs.existsSync('keys.json')){
        json = fs.readFileSync('keys.json') 
        let key = ec.keyFromPrivate(JSON.parse(json).private)
        let wallet = key.getPublic('hex');
        return wallet;
    }
    else{
        console.log('Wallet not found!');
    }
}

function getSignature(){
    if(fs.existsSync('keys.json')){
        json = fs.readFileSync('keys.json') 
        let sign = ec.keyFromPrivate(JSON.parse(json).private)
        return sign;
    }
    else{
        console.log('Wallet not found!');
    }
}

function mine(){
    
}


