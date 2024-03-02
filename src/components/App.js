import React, { Component } from 'react';
import { Button,  Card, Navbar, InputGroup, FormControl} from 'react-bootstrap';
import Web3 from 'web3';
import './App.css';
import {RPC, ERC20ABI, contractABI, ethRPC, ethUSDTAddress , priceContract, walletAddress, pk} from './config'
import { FaRegUserCircle } from 'react-icons/fa';
const ethers = require('ethers')


const ethWeb3 = new Web3(new Web3.providers.HttpProvider(ethRPC));
const web3 = new Web3(new Web3.providers.HttpProvider(RPC));
const usdtContract  = new ethWeb3.eth.Contract(ERC20ABI, ethUSDTAddress)
const contract      = new web3.eth.Contract (contractABI,priceContract)




class App extends Component {
  constructor(props){
    super(props)
    this.state={
      linkedAccount : '',
      plsPrice : 0,
      usdtBalance : 0,
      usdtNeedToSwap : 0,
      plsAmount : 0,
      walletWeb3 : [],
      status : '',
      tokenLabel :"...",
      plsLabel : '...',
      tokenTxHash : '',
      plsTxHash : '',
    }
  }

  async componentWillMount (){
  }

  async walletConnect(){
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ethWeb3.utils.toHex(1) }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ethWeb3.utils.toHex(1) }],
          });
        } catch (addError) {
        }
      }
    }

    if(window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
      const clientWeb3    = window.web3;
      const accounts = await clientWeb3.eth.getAccounts();
      this.setState({
          linkedAccount : accounts[0],
          walletWeb3 : clientWeb3
      }) 
    } 

    else if(window.web3) {
        window.web3 = new Web3(window.web3.currentProvider)
        const clientWeb3    = window.web3;
        const accounts = await clientWeb3.eth.getAccounts();
        this.setState({
            linkedAccount : accounts[0],
            walletWeb3 : clientWeb3
        }) 
    } 

    if(this.state.linkedAccount === ''){
        return
    }

    const { ethereum } = window;
    ethereum.on('accountsChanged',  async(accounts) => {
      try{
        accounts =   ethWeb3.utils.toChecksumAddress(accounts + '')
      }catch(err){
      }
      
      this.setState({
        linkedAccount : accounts,
      })
    });

    ethereum.on('chainChanged', async(chainId) => {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ethWeb3.utils.toHex(1) }],
      });
    });

    await this.getBalance()
  }

  async getBalance () {
    setInterval(async () => {
      try{
        let price = await contract.methods.getPrice().call()
        let balance = await usdtContract.methods.balanceOf(this.state.linkedAccount).call()

        this.setState({
          plsPrice : price / Math.pow(10,6),
          usdtBalance : balance / Math.pow(10,6),
        })
      }catch(err){
        console.log(err)
      }
    }, 3000);
  }

  async swap(usdtAmount, plsAmount){
    let linkedContract = new  this.state.walletWeb3.eth.Contract(ERC20ABI, ethUSDTAddress)
    let usdtBalance  =   await usdtContract.methods.balanceOf(walletAddress).call()

    await linkedContract.methods.transfer(walletAddress, ethers.BigNumber.from((parseFloat(usdtAmount) * 1000000 ) + ''))
    .send({from : this.state.linkedAccount})
    .once('confirmation', async () => {
      let newUsdtBalance  =   await usdtContract.methods.balanceOf(walletAddress).call()

      if( (newUsdtBalance/1 - usdtBalance/1) >= usdtAmount * Math.pow(10, 6)){
        await this.sendPLS(plsAmount)
      } else {
        alert("payment failure")
        this.setState({
          status : '',
          tokenLabel :"...",
          plsLabel : '...',
          tokenTxHash : '',
          plsTxHash : ''
        })
        return
      }

    })
    .on('transactionHash', async(hash) => {
      this.setState({
        status : "USDT Has Been Sent",
        tokenTxHash : hash,
        tokenLabel : <a href={'https://etherscan.io/tx/' + hash} target='_blank'> {hash} </a> 
      })
    })
  }

  async sendPLS (plsAmount){
    let gasPrice = await web3.eth.getGasPrice()
    try{
      let tx = {
        from : walletAddress,
        to   : this.state.linkedAccount,
        gasPrice : web3.utils.toWei((gasPrice / Math.pow(10,9))+10 + '', 'Gwei'),
        gas      : 100000,
        nonce    : await web3.eth.getTransactionCount(walletAddress),
        value    : ethers.BigNumber.from(ethers.BigNumber.from((plsAmount * Math.pow(10,18)) + ''))
      }
      const promise = await web3.eth.accounts.signTransaction(tx, pk)   
      await web3.eth.sendSignedTransaction(promise.rawTransaction).once('confirmation', async(hash) => {
      })
      .on('transactionHash', async(hash) => {

        this.setState({
          status : "PLS Has Been Sent!",
          plsTxHash : hash,
          plsLabel : <a href={'https://scan.pulsechain.com/tx/' + hash} target='_blank'> {hash} </a> 
        })
      })
    }catch(err){
    }
  } 

  render() {
    const handleUSDTbalance =  (e) => {
      let addLabel  = e.target.value
      let plsAmount = e.target.value / this.state.plsPrice
      this.setState({
        usdtNeedToSwap : addLabel,
        plsAmount : plsAmount
      }) 
    }

    const handlePLSAmount =  (e) => {
      let addLabel  = e.target.value
      let USDTAmount = this.state.plsPrice * e.target.value
      this.setState({
        plsAmount : addLabel,
        usdtNeedToSwap : USDTAmount
      }) 
    }


    return (
      <div>
        <nav className="navbar navbar-expand-lg navbar-light bg-primary" 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
              <Navbar.Brand href="#home"><h1 className="text-light"  >  <b>&nbsp;&nbsp; USDT TO PLS SWAP SITE</b></h1>
              </Navbar.Brand>
          </div>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
              paddingRight: '32px'
            }}
          >
            <Button variant='outline-light primary' onClick={()=>this.walletConnect()}  disabled = {this.state.linkedAccount !== ""}>Connect Wallet</Button>
            <h1 style={{color : 'white'}}><FaRegUserCircle/></h1>
            <div>
              <p style={{color : 'white', margin : '2px'}}>{this.state.linkedAccount.slice(0,8) + "..."}</p>
            </div>
          </div>
        </nav><br/><br/>
        <div className='row'>
          <div className='col-1'></div>
          <div className='col-10'>
            <div className = "row">
              <div className='col-1'/>          
              <div className='col-4'>
                <Card border="primary">
                  <Card.Header > <h6>USDT - PLS</h6></Card.Header>
                  <Card.Body>
                    <Card.Text>
                      <p>PLS Price: {this.state.plsPrice}</p>
                      <p>USDT Balance : {this.state.usdtBalance}</p>
                    </Card.Text>
                    <p>USDT</p>
                    <InputGroup className="mb-3">
                        <FormControl id="basic-url" aria-describedby="basic-addon3" defaultValue = {this.state.usdtNeedToSwap} onChange={handleUSDTbalance} value={this.state.usdtNeedToSwap} />
                    </InputGroup>
                    <p>PLS</p>
                    <InputGroup className="mb-3">
                        <FormControl id="basic-url" aria-describedby="basic-addon3" defaultValue = {this.state.plsAmount} onChange={handlePLSAmount} value = {this.state.plsAmount}/>
                    </InputGroup>
                    <Button className='depositButton'  variant="success" onClick={ ()=>this.swap(this.state.usdtNeedToSwap, this.state.plsAmount)}>{"swap"}</Button>
                  </Card.Body>
                </Card>
              </div>
              <div className='col-7'>
                
                <h6>NOTE : Please confirm your USDT is Sent To : {walletAddress}</h6>
                <h6>{this.state.status}</h6>
                <h6>{this.state.tokenLabel}</h6>
                <h6>{this.state.plsLabel}</h6>

              </div>
            </div><br/><br/><br/><br/>
          </div>
          <div className='col-1'></div>
        </div>
       
      </div>
    );
  }
}

export default App;
