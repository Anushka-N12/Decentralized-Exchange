const express = require("express");
const Moralis = require("moralis").default;
const axios = require("axios");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = 3001;
const chain = '1';

app.use(cors());
app.use(express.json());

// Utility function to handle retries
const retryRequest = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || !(error.response && error.response.status === 429)) {
      throw error;
    }
    console.warn(`Rate limit exceeded. Retrying in ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2); // Exponential backoff
  }
};

// Existing Moralis endpoint
app.get("/tokenPrice", async (req, res) => {
  const { query } = req;
  try {
    const responseOne = await Moralis.EvmApi.token.getTokenPrice({
      address: query.addressOne
    });
    const responseTwo = await Moralis.EvmApi.token.getTokenPrice({
      address: query.addressTwo
    });
    const usdPrices = {
      tokenOne: responseOne.raw.usdPrice,
      tokenTwo: responseTwo.raw.usdPrice,
      ratio: responseOne.raw.usdPrice / responseTwo.raw.usdPrice
    };
    return res.status(200).json({ usdPrices });
  } catch (error) {
    console.error('Error fetching token prices:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred while fetching token prices' });
  }
});

// New proxy endpoint for 1inch API allowance
app.get("/allowance", async (req, res) => {
  const { tokenAddress, walletAddress } = req.query;
  try {
    const fetchAllowance = async () => {
      return await axios.get(`https://api.1inch.dev/swap/v6.0/${chain}/approve/allowance`, {
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_1INCH_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          tokenAddress: tokenAddress,
          walletAddress: walletAddress
        }
      });
    };

    const response = await retryRequest(fetchAllowance);
    res.json(response.data);
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.error('Rate limit exceeded for allowance request');
      res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    } else {
      console.error('Error fetching allowance:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'An error occurred while fetching allowance' });
    }
  }
});

// New proxy endpoint for 1inch API transaction approval
app.get("/approve", async (req, res) => {
  const { tokenAddress } = req.query;
  try {
    const fetchApproval = async () => {
      return await axios.get(`https://api.1inch.dev/swap/v6.0/${chain}/approve/transaction`, {
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_1INCH_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          tokenAddress: tokenAddress
        }
      });
    };

    const response = await retryRequest(fetchApproval);
    console.log(response.data);
    res.json(response.data);
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.error('Rate limit exceeded for approval request');
      res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    } else {
      console.error('Error fetching transaction approval:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'An error occurred while fetching transaction approval' });
    }
  }
});

// Actual swap
app.get("/swap", async (req, res) => {
  const { fromTokenAddress, toTokenAddress, amount, fromAddress, slippage } = req.query;
  try {
    const fetchAllowance = async () => {
      return await axios.get(`https://api.1inch.dev/swap/v6.0/${chain}/swap`, {
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_1INCH_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          fromTokenAddress: fromTokenAddress,
          toTokenAddress: toTokenAddress,
          amount: amount,
          fromAddress: fromAddress,
          slippage: slippage
        }
      });
    };

    const response = await retryRequest(fetchAllowance);
    res.json(response.data);
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.error('Rate limit exceeded for allowance request');
      res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    } else {
      console.error('Error fetching allowance:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'An error occurred while fetching allowance' });
    }
  }
});

Moralis.start({
  apiKey: process.env.MORALIS_KEY,
}).then(() => {
  app.listen(port, () => {
    console.log(`Listening for API Calls on port ${port}`);
  });
});
