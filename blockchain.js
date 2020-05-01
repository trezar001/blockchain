//import hash function
const EC = require('elliptic').ec
const ec = new EC('secp256k1');
const SHA256 = require('crypto-js/sha256');

class Transaction{
    constructor(fromAddress='', toAddress='', amount=0, signature='System'){
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.signature = signature;
    }

    import (tx){
        this.fromAddress = tx.fromAddress;
        this.toAddress = tx.toAddress;
        this.amount = tx.amount;
        this.signature = tx.signature;
    }

    calculateHash(){
        return SHA256(this.fromAddress + this.toAddress + this.amount).toString();
    }

    signTransaction(signingKey){
        if(signingKey.getPublic('hex') !== this.fromAddress){
            throw new Error('You cannont sign transactions for other wallets!');
        }
        const hashTx = this.calculateHash();
        const sig = signingKey.sign(hashTx, 'base64');
        this.signature = sig.toDER('hex');
    }

    isValid(){
        //was coin mined (special case)
        if(this.fromAddress === null) return true;
        //missing signature
        if(!this.signature || this.signature.length === 0){
            throw new Error('No signature in this transaction');
        }

        //if signature, verify public key signed this transaction
        const publicKey = ec.keyFromPublic(this.fromAddress,'hex');
        return publicKey.verify(this.calculateHash(), this.signature);
    }
}

class Block{
    constructor(timestamp, transactions, previousHash = '', hash=this.calculateHash(), nonce=0){
        this.timestamp = timestamp;
        this.transactions = transactions
        this.previousHash = previousHash;
        this.hash = hash
        this.nonce = nonce
    }

    calculateHash(){
        return SHA256(this.previousHash + this.timestamp
            + JSON.stringify(this.data) + this.nonce).toString();
    }

    //proof of work
    mineBlock(difficulty){
        //keep hashing until designated "key" is found
        while(this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')){
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log("Block mined: " + this.hash);
    }
    

    hasValidTransactions(){
        for(let tx of this.transactions){
            if(!tx.isValid()){
                return false;
            }
        }
        return true;
    }
}

class Blockchain{
    constructor(json){
        if(json){
            let temp = [json.chain.length];
            for(let i = 0; i < json.chain.length; i++){
                if(i == 0){
                    temp[i] = new Block(json.chain[i].timestamp, json.chain[i].transactions, json.chain[i].previousHash)
                }  
                else {
                    let tx = [json.chain[i].transactions.length]
                    for(let j = 0; j < json.chain[i].transactions.length; j++){
                        tx[j] = new Transaction(json.chain[i].transactions[j].fromAddress, json.chain[i].transactions[j].toAddress, json.chain[i].transactions[j].amount, json.chain[i].transactions[j].signature)
                    }
                    temp[i] = new Block(json.chain[i].timestamp, tx, json.chain[i].previousHash, json.chain[i].hash, json.chain[i].nonce)
                }          
            }
            this.chain = temp;
            this.difficulty = json.difficulty;
            this.pendingTransactions = json.pendingTransactions;
            this.reward = json.reward;
            this.decimals = json.decimals;
            this.icon = json.icon;
            this.pendingBlock = new Block(Date.now(), this.pendingTransactions, this.chain[this.chain.length-1].hash);
        }
        else{
            this.chain = [this.createGenesisBlock()];
            this.difficulty = 4;
            this.pendingTransactions = [];
            this.reward = 3;
            this.decimals = 4;     
            this.icon = 'BLK'  
            this.pendingBlock = new Block(Date.now(), this.pendingTransactions, this.chain[this.chain.length-1].hash);
        }       
    }

    createGenesisBlock(){
        //create the starting block for our blockchain
        return new Block('01/01/2020', 'Genesis block', '0');
    }

    getLatestBlock(){
        return this.chain[this.chain.length - 1];
    }

    sendHash(rewardAddress){
        let rewardTx = new Transaction(null, rewardAddress, this.reward);
        this.pendingTransactions.push(rewardTx);

        //console.log('Block successfully mined!');
        this.chain.push(this.pendingBlock);

        //payout
        this.pendingTransactions = [];
        this.pendingBlock = new Block(Date.now(), this.pendingTransactions, this.chain[this.chain.length-1].hash);;
    }

    minePendingTransactions(rewardAddress){
        let rewardTx = new Transaction(null, rewardAddress, this.reward);
        this.pendingTransactions.push(rewardTx);

        let block = new Block(Date.now(), this.pendingTransactions, this.chain[this.chain.length-1].hash);
        block.mineBlock(this.difficulty);

        //console.log('Block successfully mined!');
        this.chain.push(block);

        //payout
        this.pendingTransactions = [];
    }

    addTransaction(transaction){
        if(!transaction.fromAddress || !transaction.toAddress){
            throw new Error('Transaction must include from and to address!');
        }
        if(!transaction.isValid()){
            throw new Error('Cannot add invalid transaction to chain!');
        }

        this.pendingTransactions.push(transaction);
        this.pendingBlock = new Block(Date.now(), this.pendingTransactions, this.chain[this.chain.length-1].hash);
    }

    getPendingBalance(address){
        let balance = 0;
        for(const transaction of this.pendingBlock.transactions){
            if(transaction.fromAddress === address){
                balance -= transaction.amount
            }
            if(transaction.toAddress === address){
                balance += transaction.amount
            }
        }
        return balance;
    }

    getBalance(address){
        let balance = 0;
        for(const block of this.chain){
            for(const transaction of block.transactions){
                if(transaction.fromAddress === address){
                    balance -= transaction.amount
                }
                if(transaction.toAddress === address){
                    balance += transaction.amount
                }
            }
        }
        return balance;
    }

    addBlock(block){
        block.previousHash = this.getLatestBlock().hash;
        block.mineBlock(this.difficulty);
        block.hash = block.calculateHash();
        this.chain.push(block);
    }

    isChainValid(){
        for(let i = 1; i < this.chain.length; i++){
            let curBlock = this.chain[i];
            let prevBlock = this.chain[i-1];

            if(!curBlock.hasValidTransactions()){
                return false;
            }

            if(curBlock.hash !== curBlock.calculateHash()){
                console.log(curBlock.hash);
                console.log(curBlock.calculateHash());


                return false;
            }
    
            if(curBlock.previousHash !== prevBlock.hash){
                return false;
            }
        }
        return true;
    }
}

module.exports = {Blockchain, Transaction};