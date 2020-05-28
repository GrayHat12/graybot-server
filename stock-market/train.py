import json
import numpy as np
from sklearn import svm,preprocessing
import sklearn
import pickle
import requests
import time
import pandas as pd
from sklearn_porter import Porter

file = 'BHARTIARTL.NS.json'
toseefeatures = ['Balance Of Power (BOP)', 'Chaikin A/D Line', 'On Balance Volume (OBV)', 'Hilbert Transform - Trend vs Cycle Mode (HT_TRENDMODE)', 'Parabolic SAR (SAR)', 'True Range (TRANGE)', 'Stochastic Fast (STOCHF)', 'Stochastic (STOCH)', 'Simple Moving Average (SMA)', 'Exponential Moving Average (EMA)', 'Weighted Moving Average (WMA)', 'Triangular Exponential Moving Average (TRIMA)', "Williams' %R (WILLR)", 'Commodity Channel Index (CCI)', 'Minus Directional Movement (MINUS_DM)', 'Plus Directional Movement (PLUS_DM)', 'Bollinger Bands (BBANDS)', 'MidPoint over period (MIDPOINT)', 'Midpoint Price over period (MIDPRICE)', 'Chaikin A/D Oscillator (ADOSC)', 'Kaufman Adaptive Moving Average (KAMA)', 'Relative Strength Index (RSI)', 'Momentum (MOM)', 'Chande Momentum Oscillator (CMO)', 'Rate of change : ((price/prevPrice)-1)*100', 'Rate of change ratio: (price/prevPrice)', 'Aroon (AROON)', 'Aroon Oscillator (AROONOSC)', 'Money Flow Index (MFI)', 'Directional Movement Index (DX)', 'Minus Directional Indicator (MINUS_DI)', 'Plus Directional Indicator (PLUS_DI)', 'Average True Range (ATR)', 'Normalized Average True Range (NATR)', 'Stochastic Relative Strength Index (STOCHRSI)', 'Double Exponential Moving Average (DEMA)', 'Average Directional Movement Index (ADX)', 'Absolute Price Oscillator (APO)', 'Percentage Price Oscillator (PPO)', 'Triple Exponential Moving Average (TEMA)', 'Average Directional Movement Index Rating (ADXR)', '1-day Rate-Of-Change (ROC) of a Triple Smooth EMA (TRIX)', 'Ultimate Oscillator (ULTOSC)', 'MESA Adaptive Moving Average (MAMA)', 'Hilbert Transform - Dominant Cycle Period (HT_DCPERIOD)', 'Hilbert Transform - Phasor Components (HT_PHASOR)', 'Moving Average Convergence/Divergence (MACD)', 'MACD with Controllable MA Type (MACDEXT)', 'Triple Exponential Moving Average (T3)', 'Hilbert Transform - Instantaneous Trendline (HT_TRENDLINE)', 'Hilbert Transform - SineWave (HT_SINE)', 'Hilbert Transform - Dominant Cycle Phase (HT_DCPHASE)']

"""Outdated"""
def process(filename=file):
    data = json.loads(open(filename,'r',encoding='utf-8').read())
    pricing = json.loads(open('price.json','r',encoding='utf-8').read())

    data = data['Technical Analysis']

    dates = list(data.keys())
    dates.reverse()

    features = {}
    answerList = {}
    
    i=0
    prevPrice = 0
    prevDate = ''
    total = len(dates)
    for date in dates:
        precent = int(((i+1)/total)*100)
        print(str(precent)+'%',end='\r')
        currentPrice = 0
        try:
            currentPrice = float(pricing['Weekly Adjusted Time Series'][date]['5. adjusted close'])
        except:
            print('except',i)
            print()
            continue
        dateFeatures = list(data[date].keys())
        if len(dateFeatures) != len(toseefeatures):
            continue
        for dateFeature in dateFeatures:
            if dateFeature not in features.keys():
                features[dateFeature] = []
            value = list(data[date][dateFeature].keys())[0]
            pushdata = float(data[date][dateFeature][value])
            features[dateFeature].append(pushdata)
        if i == 0:
            i += 1
            print(date)
            continue
        elif i > 0:
            if prevPrice <= currentPrice:
                answerList[prevDate] = True
            else:
                answerList[prevDate] = False
        prevPrice = currentPrice
        prevDate = date  
        i+=1

    with open(filename.split('json')[0]+'NEW.json','w+',encoding='utf-8') as f:
        json.dump(features,f)
    with open('answers.json','w+',encoding='utf-8') as f:
        json.dump({'answers' : answerList},f)
    print('done')

"""Outdated"""
def newprocess(filename=file):
    data = json.loads(open(filename,'r',encoding='utf-8').read())
    pricing = json.loads(open('price.json','r',encoding='utf-8').read())

    data = data['Technical Analysis']

    dates = list(data.keys())
    dates.reverse()
    prevPrice = 0
    prevDate = ''
    features = {}
    answers = {}
    total = len(dates)
    i=0
    for date in dates:
        precent = int(((i+1)/total)*100)
        print(str(precent)+'%',end='\r')
        currentPrice = 0
        try:
            currentPrice = float(pricing['Weekly Adjusted Time Series'][date]['5. adjusted close'])
        except:
            print('except',i)
            print()
            continue
        dateFeatures = list(data[date].keys())
        if len(dateFeatures) != len(toseefeatures):
            continue
        featureList = []
        for feature in toseefeatures:
            tdata = data[date][feature]
            key = list(tdata.keys())[0]
            value = float(tdata[key])
            featureList.append(value)
        if i==0:
            prevPrice = currentPrice
            prevDate = date
            i+=1
            continue
        features[date] = featureList
        if prevPrice <= currentPrice:
            #profit
            answers[date] = 1
        else:
            #loss
            answers[date] = 0
        prevDate = date
        prevPrice = currentPrice
        i+=1
    with open(filename.split('json')[0]+'NEW.json','w+',encoding='utf-8') as f:
        json.dump(features,f)
    with open('answers.json','w+',encoding='utf-8') as f:
        json.dump(answers,f)
    print('done')
       
"""Currently using"""
def generateCsv(features=toseefeatures):
    extra = ['name','date','price','status']
    extra.extend(features)
    dataframe = pd.DataFrame(columns=extra)
    data = json.loads(open('bigdata.json','r',encoding='utf-8').read())
    data = data['Symbol']
    companies = list(data.keys())
    maxl = len(companies)
    i=0
    for company in companies:
        i+=1
        stockdata = json.loads(open('./company/'+company+'-stock.json','r',encoding='utf-8').read())
        cdata = data[company]['Technical Analysis']
        dates = list(cdata.keys())
        dates.reverse()
        rows = []
        for date in dates:
            samplerow = {}
            for feature in extra:
                samplerow[feature] = np.nan
            ddata = cdata[date]
            currentRow = samplerow
            cfeatures = list(ddata.keys()) 
            for feat in cfeatures:
                fdata = ddata[feat]
                value = fdata[list(fdata.keys())[0]]
                try:
                    currentRow[feat] = float(value)
                except:
                    currentRow[feat] = np.nan
                    #print(156,value)
            currentRow['name'] = company
            currentRow['date'] = date
            price = currentRow['price']
            try:
                price = float(stockdata['Weekly Adjusted Time Series'][date]['5. adjusted close'])
                currentRow['price'] = price
                lastIndex = len(rows)-1
                if lastIndex >= 0:
                    pPrice = rows[lastIndex]['price']
                    cprice = price
                    if cprice >= pPrice:
                        rows[lastIndex]['status'] = 1
                    else:
                        rows[lastIndex]['status'] = 0
            except:
                pass
            print((str(company)+'-'+str(currentRow['price'])+'|'+str(date)).center(50,'*'),end='\r')
            rows.append(currentRow)
        for row in rows:
            dataframe = dataframe.append(row,ignore_index=True)
    dataframe.to_csv('stats.csv',index=True)
            
        
#generateCsv()

#print('Done CSV')

FEATURES = "Balance Of Power (BOP),Chaikin A/D Line,On Balance Volume (OBV),Hilbert Transform - Trend vs Cycle Mode (HT_TRENDMODE),Parabolic SAR (SAR),True Range (TRANGE),Stochastic Fast (STOCHF),Stochastic (STOCH),Simple Moving Average (SMA),Exponential Moving Average (EMA),Weighted Moving Average (WMA),Triangular Exponential Moving Average (TRIMA),Williams' %R (WILLR),Commodity Channel Index (CCI),Minus Directional Movement (MINUS_DM),Plus Directional Movement (PLUS_DM),Bollinger Bands (BBANDS),MidPoint over period (MIDPOINT),Midpoint Price over period (MIDPRICE),Chaikin A/D Oscillator (ADOSC),Kaufman Adaptive Moving Average (KAMA),Relative Strength Index (RSI),Momentum (MOM),Chande Momentum Oscillator (CMO),Rate of change : ((price/prevPrice)-1)*100,Rate of change ratio: (price/prevPrice),Aroon (AROON),Aroon Oscillator (AROONOSC),Money Flow Index (MFI),Directional Movement Index (DX),Minus Directional Indicator (MINUS_DI),Plus Directional Indicator (PLUS_DI),Average True Range (ATR),Normalized Average True Range (NATR),Stochastic Relative Strength Index (STOCHRSI),Double Exponential Moving Average (DEMA),Average Directional Movement Index (ADX),Absolute Price Oscillator (APO),Percentage Price Oscillator (PPO),Triple Exponential Moving Average (TEMA),Average Directional Movement Index Rating (ADXR),1-day Rate-Of-Change (ROC) of a Triple Smooth EMA (TRIX),Ultimate Oscillator (ULTOSC),MESA Adaptive Moving Average (MAMA),Hilbert Transform - Dominant Cycle Period (HT_DCPERIOD),Hilbert Transform - Phasor Components (HT_PHASOR),Moving Average Convergence/Divergence (MACD),MACD with Controllable MA Type (MACDEXT),Triple Exponential Moving Average (T3),Hilbert Transform - Instantaneous Trendline (HT_TRENDLINE),Hilbert Transform - SineWave (HT_SINE),Hilbert Transform - Dominant Cycle Phase (HT_DCPHASE)".split(',')

def build_data_set(features = FEATURES):
    data_df = pd.read_csv('stats.csv')
    data_df.dropna()
    data_df = data_df.reindex(np.random.permutation(data_df.index))
    X = np.array(data_df[features].values)#.tolist())
    #NX = []
    print(len(X))
    """for x in X:
        if None in x or '' in x or np.nan in x:
            continue
        NX.append(x)"""
    #print(len(NX))
    y = (data_df["status"]
         .values.tolist())
    X = preprocessing.scale(X)
    return X,y

def anaysis():
    test_size = 500
    print('build data set')
    X,y = build_data_set()
    print('analyse')
    print(len(X))
    print(X.shape)
    print(len(y))
    clf = sklearn.svm.LinearSVC()
    clf.fit(X[:-test_size],y[:-test_size])
    correct_count = 0
    """out = {
        'sets' : []
    }"""
    for x in range(1,test_size+1):
        pred = clf.predict([X[-x]])[0]
        """tmp = {}
        tmp['data'] = X[-x].tolist()
        tmp['value'] = y[-x]
        tmp['guess'] = int(pred)
        out['sets'].append(tmp)"""
        if pred == y[-x]:
            correct_count += 1
    #with open('test.json','w+',encoding='utf-8') as file:
    #    json.dump(out,file)
    print('Accuracy:',(correct_count/test_size)*100.00)
    with open('tryLSVC.pkl', 'wb') as fid:
        pickle.dump(clf,fid)
    clf = svm.SVC(kernel='linear',C=1.0)
    clf.fit(X[:-test_size],y[:-test_size])
    correct_count = 0
    for x in range(1,test_size+1):
        if clf.predict([X[-x]])[0] == y[-x]:
            correct_count += 1
    print('Accuracy:',(correct_count/test_size)*100.00)
    with open('trySVC.pkl', 'wb') as fid:
        pickle.dump(clf,fid)

anaysis()
    

exit(0)
    
#newprocess()

"""Old . Pls Ignore"""
data = json.loads(open(file.split('json')[0]+'NEW.json','r',encoding='utf-8').read())

dates = list(data.keys())

print(dates[:10])

big = []

for date in dates:
    small = data[date]
    big.append(small)

answersData = json.loads(open('answers.json','r',encoding='utf-8').read())

Y = []

for date in answersData.keys():
    Y.append(answersData[date])
    
Y = np.array(Y)

X = np.array(big)

print(X.shape)
print(X[:2])
print(Y.shape)
print(Y[:2])

#clf = svm.SVC(kernel='linear',C=1.0)
clf = sklearn.svm.LinearSVC()
print('Fitting')
clf.fit(X,Y)
print('Done Fitting')
with open('my_dumped_classifier.pkl', 'wb') as fid:
    pickle.dump(clf,fid)

"""
#TO LOAD
with open('my_dumped_classifier.pkl', 'rb') as fid:
    clf_loaded = pickle.load(fid)"""