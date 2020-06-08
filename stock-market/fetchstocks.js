const axios = require("axios");
//const alphaVantage = require("./alpha_vantage");
const fs = require("fs");
const keys = require("../keys.json").keys;
const settings = require("./settings.json");

var currentKeyIndex = 0;

const url = "https://www.alphavantage.co/query";

const companies = [
  "TCS.NS",
  "COALINDIA.NS",
  "WIPRO.NS",
  "BRITANNIA.NS",
  "BHARTIARTL.NS",
  "NESTLEIND.NS",
  "ONGC.NS",
  "TECHM.NS",
  "RELIANCE.NS",
  "ICICIBANK.NS",
  "MARUTI.NS",
  "BAJAJ-AUTO.NS",
  "NTPC.NS",
  "ZEEL.NS",
  "HEROMOTOCO.NS",
  "KOTAKBANK.NS",
  "ULTRACEMCO.NS",
  "TITAN.NS",
  "INDUSINDBK.NS",
  "ITC.NS",
];
//19 x 56 = 1064
//178 req / key

const functions = [
  [
    "BOP",
    "AD",
    "OBV",
    "HT_TRENDMODE",
    "SAR",
    "TRANGE",
    "STOCHF",
    "STOCH",
    "SMA",
  ],
  [
    "EMA",
    "WMA",
    "TRIMA",
    "WILLR",
    "CCI",
    "MINUS_DM",
    "PLUS_DM",
    "BBANDS",
    "MIDPOINT",
  ],
  ["MIDPRICE", "ADOSC", "KAMA", "RSI", "MOM", "CMO", "ROC", "ROCR", "AROON"],
  [
    "AROONOSC",
    "MFI",
    "DX",
    "MINUS_DI",
    "PLUS_DI",
    "ATR",
    "NATR",
    "STOCHRSI",
    "DEMA",
  ],
  [
    "ADX",
    "APO",
    "PPO",
    "TEMA",
    "ADXR",
    "TRIX",
    "ULTOSC",
    "MAMA",
    "HT_DCPERIOD",
  ],
  [
    "HT_PHASOR",
    "MACD",
    "MACDEXT",
    "T3",
    "HT_TRENDLINE",
    "HT_SINE",
    "HT_DCPHASE",
  ],
];

var CreatedDailyData = {
  company: {
    function: {
      value: 0,
    },
  },
};

async function doStuff(Csettings = settings, funcs = [""], i) {
  for (var i = 0; i < funcs.length; i++) {
    Csettings.function = funcs[i];
    var val = await getSingleFunction(Csettings);
    var [stat, comp] = val.shift();
    var selected = val.shift();
    CreatedDailyData["" + comp]["" + stat] = {
      value: selected[1],
    };
    console.log(
      "Done",
      ": i",
      i,
      ":",
      Object.keys(CreatedDailyData[comp]).length,
      "/ 52"
    );
    await sleep(18000);
  }
  return i;
}

async function getSingleCompany(company = companies[0]) {
  var thisSettings = settings;
  thisSettings.symbol = company;
  CreatedDailyData["" + company] = {};
  //console.log(CreatedDailyData);
  for (var i = 0; i < keys.length; i++) {
    thisSettings.apikey = keys[i];
    var val = await doStuff(thisSettings, functions[i], i);
    console.log("Batch Finished", functions[i]);
  }
  saveData(
    CreatedDailyData[thisSettings.symbol],
    `./dailyData/${thisSettings.symbol}.json`
  );
}

async function getSingleFunction(Csettings = settings) {
  var res = await axios.default.get(url, { params: Csettings });
  var data = res.data;
  if (res.status != 200) {
    console.log(data, settings);
  }
  try {
    data = data[Object.keys(data)[1]];
  } catch (err) {
    console.log(data, settings);
    throw new Error(err);
  }
  var dateData = [[Csettings.function, Csettings.symbol]];
  var keyList = [];
  try {
    keyList = Object.keys(data);
  } catch (err) {
    console.log(res, settings);
    throw new Error(err);
  }
  for (var i = 0; i < keyList.length; i++) {
    var date = keyList[i];
    var value = 0;
    try {
      value = parseFloat(data[date][Object.keys(data[date])[0]]);
    } catch (err) {
      value = null;
    }
    dateData.push([date, value]);
  }
  return dateData;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function saveData(data, path) {
  try {
    fs.writeFileSync(path, JSON.stringify(data));
  } catch (err) {
    console.error(err);
  }
}

async function gtAll() {
  for (var c = companies.length-1; c < companies.length; c++) {
    console.log("Starting", companies[c], "---------------");
    await getSingleCompany(companies[c]);
    await sleep(20000);
    console.log("Done", companies[c], "----------------");
  }
}

gtAll()
  .then(() => {
    console.log("Complete");
  })
  .catch(console.error);

module.exports.refresh = gtAll;