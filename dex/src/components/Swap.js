import React, { useState, useEffect } from 'react'
import { Input, Popover, Radio, Modal, message } from "antd";
import {
  ArrowDownOutlined,
  CloseOutlined,
  DownOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import tokenList from "../tokenList.json";
import axios from "axios";
import { useSendTransaction, useWaitForTransaction } from "wagmi";

function Swap(props) {
  const { address, isConnected } = props;
  const { messageApi, contextHolder } = message.useMessage();
  const [slippage, setSlippage] = useState(2.5);
  const [tokenOneAmount, setTokenOneAmount] = useState(null);
  const [tokenTwoAmount, setTokenTwoAmount] = useState(null);
  const [tokenOne, setTokenOne] = useState(tokenList[0]);
  const [tokenTwo, setTokenTwo] = useState(tokenList[1]);
  const [isOpen, setIsOpen] = useState(true);
  const [isOpen1, setIsOpen1] = useState(false);
  const [changeToken, setChangeToken] = useState(1);
  const [prices, setPrices] = useState(null);
  const [txDetails, setTxDetails] = useState({ to: null, data: null, value: null })
  const { data, sendTransaction } = useSendTransaction({
    request: {
      from: address,
      to: String(txDetails.to),
      data: String(txDetails.data),
      value: String(txDetails.value)
    }
  })
  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  })
  const link = 'http://localhost:3001';

  function handleSlippage(e) {
    setSlippage(e.target.value);
  }

  function changeAmount(e) {
    const amount = e.target.value;
    setTokenOneAmount(amount);
    console.log(amount);
    console.log(prices.usdPrices);
    if (amount && prices.usdPrices) {
      const calc = (amount * prices.usdPrices.ratio).toFixed(2);
      setTokenTwoAmount(calc)
    } else {
      setTokenTwoAmount(null);
    }
  }

  function openModal() {
    setIsOpen(true);
  }

  function openModal1(asset) {
    setChangeToken(asset);
    setIsOpen1(true);
  }

  function modifyToken(i) {
    setPrices(null);
    setTokenOneAmount(null);
    setTokenTwoAmount(null);
    if (changeToken === 1) {
      setTokenOne(tokenList[i]);
      fetchPrices(tokenList[i].address, tokenTwo.address)
    }
    else {
      setTokenTwo(tokenList[i]);
      fetchPrices(tokenOne.address, tokenList[i].address)

    }
    setIsOpen1(false);
  }

  async function fetchPrices(one, two) {
    try {
      console.log('Fetching prices for:', one, two);
      const res = await axios.get(link + '/tokenPrice', {
        params: { addressOne: one, addressTwo: two }
      });
      console.log('Updating prices');
      setPrices(res.data);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  }

  async function fetchDexSwap() {
    const config = {
      params: {
        tokenAddress: tokenOne.address,
        walletAddress: address
      }
    };
    const chain = '1';
    const allowance = await axios.get(link + `/allowance`, config)
    if (allowance.data.allowance === "0") {
      console.log('Call 1 successful but gave 0, doing #2 now');
      const config1 = {
        params: { tokenAddress: tokenOne.address }
      };
      const approve = await axios.get(link + `/approve`, config1)
      setTxDetails(approve.data);
      console.log("Not Approved")
      return

    }
    console.log('Call 1 successful & allowed, doing #2 now');
    console.log("Making Swap")
    const config2 = {
      params: {
        fromTokenAddress: tokenOne.address,
        toTokenAddress: tokenTwo.address,
        amount: tokenOneAmount.padEnd(tokenOne.decimals + tokenOneAmount.length, '0'),
        fromAddress: address,
        slippage: slippage
      }
    };
    const tx = await axios.get(link + `/swap`, config2)
    let decimals = Number(`1E${tokenTwo.decimals}`)
    setTokenTwoAmount((Number(tx.data.toTokenAmount) / decimals).toFixed(2));
    setTxDetails(tx.data.tx);
  }

  useEffect(() => {
    console.log('Calling fetchPrices');
    fetchPrices(tokenList[0].address, tokenList[1].address)
  }, [])

  useEffect(() => {
    console.log('transaction effect triggered');
    console.log(txDetails.to && isConnected);
    if (txDetails.to && isConnected) {
      console.log('running inside if');
      sendTransaction();
    }
  }, [txDetails])

  // useEffect(() => {
  //   messageApi.destroy();
  //   if (isLoading) {
  //     messageApi.open({
  //       type: 'loading',
  //       content: 'Transaction is pending...',
  //       duration: 0,
  //     })
  //   }
  // }, [isLoading])

  // useEffect(() => {
  //   messageApi.destroy();
  //   if (isSuccess) {
  //     messageApi.open({
  //       type: 'success',
  //       content: 'Transaction Successful',
  //       duration: 1.5,
  //     })
  //   } else if (txDetails.to) {
  //     messageApi.open({
  //       type: 'error',
  //       content: 'Transaction Failed',
  //       duration: 1.50,
  //     })
  //   }
  // }, [isSuccess])

  const settings = (
    <>
      <div>Slippage Tolerance</div>
      <div>
        <Radio.Group value={slippage} onChange={handleSlippage} >
          <Radio.Button value={0.5}>0.5%</Radio.Button>
          <Radio.Button value={2.5}>2.5% </Radio.Button>
          <Radio.Button value={5}>5.0%</Radio.Button>
        </Radio.Group>
      </div>
    </>
  );

  return (
    <>
      {contextHolder}
      <button onClick={() => openModal()}>Trade</button>
      <Modal
        open={isOpen}
        footer={null}
        onCancel={() => setIsOpen(false)}
        title="Swapper"
        className="tradeBox"
      >

        <div className="tradeBoxHeader">
          <h4></h4>
          <Popover
            content={settings}
            title="Settings"
            trigger="click"
            placement="bottomRight" >
            <SettingOutlined className="cog" />
          </Popover>
        </div>
        <div className='inputs'>
          <Input placeholder="0" value={tokenOneAmount} onChange={changeAmount} />
          <Input placeholder="0" value={tokenTwoAmount} disabled={true} />
          {/* <div className="switchButton" onClick={switchTokens}>
          <ArrowDownOutlined className="switchArrow" />
        </div> */}
          <div className="assetOne" onClick={() => openModal1(1)}>
            <img src={tokenOne.img} alt="assetOneLogo" className="assetLogo" />
            {tokenOne.ticker}
            <DownOutlined />
          </div>
          <div className="assetTwo">
            <img src={tokenTwo.img} alt="assetTwoLogo" className="assetLogo" />
            {tokenTwo.ticker}
          </div>
        </div>
        <div className='swapButton' disabled={!tokenOneAmount || !isConnected} onClick={fetchDexSwap}>Swap</div>
      </Modal>
      <Modal
        open={isOpen1}
        footer={null}
        onCancel={() => setIsOpen1(false)}
        title="Select a token">
        <div className='modalContent'>
          {tokenList?.map((e, i) => {
            return (
              <div className='tokenChoice'
                key={i}
                onClick={() => modifyToken(i)}>
                <img src={e.img} alt={e.ticker} className='tokenLogo' />
                <div className='tokenChoiceNames'>
                  <div className='tokenName'>{e.name}</div>
                  <div className='tokenTicker'>{e.ticker}</div>
                </div>
              </div>
            )
          }
          )}
        </div>
      </Modal>
    </>
  );
}
export default Swap