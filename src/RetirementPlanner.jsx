import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RetirementPlanner = () => {
  const [inputs, setInputs] = useState({
    currentAge: parseFloat(import.meta.env.VITE_DEFAULT_CURRENT_AGE) || 35,
    currentIncome: parseFloat(import.meta.env.VITE_DEFAULT_CURRENT_INCOME) || 75000,
    savingsToRetirement: parseFloat(import.meta.env.VITE_DEFAULT_SAVINGS_TO_RETIREMENT) || 10,
    savingsToInvestment: parseFloat(import.meta.env.VITE_DEFAULT_SAVINGS_TO_INVESTMENT) || 5,
    homeValue: parseFloat(import.meta.env.VITE_DEFAULT_HOME_VALUE) || 400000,
    homeAppreciationRate: parseFloat(import.meta.env.VITE_DEFAULT_HOME_APPRECIATION_RATE) || 3.0,
    marketReturn: parseFloat(import.meta.env.VITE_DEFAULT_MARKET_RETURN) || 7.0,
    inflationRate: parseFloat(import.meta.env.VITE_DEFAULT_INFLATION_RATE) || 2.5,
    retirementAge: parseFloat(import.meta.env.VITE_DEFAULT_RETIREMENT_AGE) || 65,
    retirementIncomePercent: parseFloat(import.meta.env.VITE_DEFAULT_RETIREMENT_INCOME_PERCENT) || 70,
    numSimulations: parseFloat(import.meta.env.VITE_DEFAULT_NUM_SIMULATIONS) || 100,
  });

  const [showTables, setShowTables] = useState(false);

  // Alberta tax calculation (simplified 2024 rates)
  const calculateAlbertaTax = (income) => {
    // Federal tax brackets (2024)
    const federalBrackets = [
      { max: 55867, rate: 0.15 },
      { max: 111733, rate: 0.205 },
      { max: 173205, rate: 0.26 },
      { max: 246752, rate: 0.29 },
      { max: Infinity, rate: 0.33 }
    ];

    // Alberta provincial tax brackets (2024)
    const provincialBrackets = [
      { max: 148269, rate: 0.10 },
      { max: 177922, rate: 0.12 },
      { max: 237230, rate: 0.13 },
      { max: 355845, rate: 0.14 },
      { max: Infinity, rate: 0.15 }
    ];

    const calculateTaxFromBrackets = (income, brackets) => {
      let tax = 0;
      let previousMax = 0;
      
      for (const bracket of brackets) {
        if (income > previousMax) {
          const taxableInBracket = Math.min(income, bracket.max) - previousMax;
          tax += taxableInBracket * bracket.rate;
          previousMax = bracket.max;
        } else {
          break;
        }
      }
      return tax;
    };

    const federalTax = calculateTaxFromBrackets(income, federalBrackets);
    const provincialTax = calculateTaxFromBrackets(income, provincialBrackets);
    
    // CPP and EI contributions (simplified)
    const cppContribution = Math.min(income * 0.0595, 3867);
    const eiContribution = Math.min(income * 0.0163, 1049);
    
    return federalTax + provincialTax + cppContribution + eiContribution;
  };

  // Normal distribution random number generator (Box-Muller transform)
  const randomNormal = (mean, stdDev) => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  };

  // Run a single simulation
  const runSimulation = (params) => {
    const {
      currentAge,
      currentIncome,
      savingsToRetirement,
      savingsToInvestment,
      homeValue,
      homeAppreciationRate,
      marketReturn,
      inflationRate,
      retirementAge,
      retirementIncomePercent,
      isStochastic = false
    } = params;

    const years = [];
    let age = currentAge;
    let income = currentIncome;
    let retirementAccount = 0;
    let investmentAccount = 0;
    let currentHomeValue = homeValue;

    // Track pre-retirement income for retirement calculation
    let preRetirementIncome = currentIncome;

    while (age <= 95) {
      const isRetired = age >= retirementAge;
      
      // Stochastic rates if Monte Carlo, otherwise use fixed rates
      const yearInflation = isStochastic ? 
        Math.max(0, randomNormal(inflationRate / 100, 0.015)) : 
        inflationRate / 100;
      
      const yearHomeAppreciation = isStochastic ? 
        randomNormal(homeAppreciationRate / 100, 0.02) : 
        homeAppreciationRate / 100;
      
      const yearMarketReturn = isStochastic ? 
        randomNormal(marketReturn / 100, 0.12) : 
        marketReturn / 100;

      if (!isRetired) {
        // Working years
        const grossIncome = income;
        const taxes = calculateAlbertaTax(grossIncome);
        const netIncome = grossIncome - taxes;
        
        const retirementContribution = grossIncome * (savingsToRetirement / 100);
        const investmentContribution = grossIncome * (savingsToInvestment / 100);
        
        // Add contributions and apply returns
        retirementAccount = (retirementAccount + retirementContribution) * (1 + yearMarketReturn);
        investmentAccount = (investmentAccount + investmentContribution) * (1 + yearMarketReturn);
        
        // Update income for next year
        income = income * (1 + yearInflation);
        preRetirementIncome = income;
      } else {
        // Retirement years
        const requiredIncome = preRetirementIncome * (retirementIncomePercent / 100);
        const requiredIncomeAfterTax = requiredIncome;
        
        // Withdraw from retirement account first, then investment account
        let withdrawal = requiredIncomeAfterTax;
        
        if (retirementAccount >= withdrawal) {
          retirementAccount -= withdrawal;
        } else {
          withdrawal -= retirementAccount;
          retirementAccount = 0;
          investmentAccount -= withdrawal;
        }
        
        // Apply returns to remaining balances
        retirementAccount = retirementAccount * (1 + yearMarketReturn);
        investmentAccount = investmentAccount * (1 + yearMarketReturn);
        
        // Update required income with inflation
        preRetirementIncome = preRetirementIncome * (1 + yearInflation);
      }

      // Appreciate home value
      currentHomeValue = currentHomeValue * (1 + yearHomeAppreciation);

      // Calculate net worth
      const netWorth = retirementAccount + investmentAccount + currentHomeValue;

      years.push({
        age,
        year: 2025 + (age - currentAge),
        netWorth,
        retirementAccount,
        investmentAccount,
        homeValue: currentHomeValue,
        income: isRetired ? -preRetirementIncome * (retirementIncomePercent / 100) : income,
        isRetired,
        inflationRate: yearInflation * 100,
        homeAppreciationRate: yearHomeAppreciation * 100,
        marketReturn: yearMarketReturn * 100,
      });

      age++;
    }

    return years;
  };

  // Run Monte Carlo simulations
  const simulations = useMemo(() => {
    const results = [];
    
    // Base case (deterministic)
    results.push({
      name: 'Base Case',
      data: runSimulation({ ...inputs, isStochastic: false }),
      isBase: true,
    });

    // Monte Carlo simulations
    for (let i = 0; i < inputs.numSimulations; i++) {
      results.push({
        name: `Simulation ${i + 1}`,
        data: runSimulation({ ...inputs, isStochastic: true }),
        isBase: false,
      });
    }

    return results;
  }, [inputs]);

  // Calculate percentiles for visualization
  const percentileData = useMemo(() => {
    const baseData = simulations[0].data;
    const monteCarloSims = simulations.slice(1);

    return baseData.map((baseYear, index) => {
      const netWorths = monteCarloSims.map(sim => sim.data[index].netWorth);
      netWorths.sort((a, b) => a - b);

      const p10 = netWorths[Math.floor(netWorths.length * 0.10)];
      const p25 = netWorths[Math.floor(netWorths.length * 0.25)];
      const p50 = netWorths[Math.floor(netWorths.length * 0.50)];
      const p75 = netWorths[Math.floor(netWorths.length * 0.75)];
      const p90 = netWorths[Math.floor(netWorths.length * 0.90)];

      return {
        age: baseYear.age,
        year: baseYear.year,
        baseCase: baseYear.netWorth,
        p10,
        p25,
        p50,
        p75,
        p90,
      };
    });
  }, [simulations]);

  const handleInputChange = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      padding: '3rem 2rem',
      fontFamily: '"Crimson Pro", Georgia, serif',
      color: '#f5f5f0',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Work+Sans:wght@400;500;600&display=swap');
        
        * {
          box-sizing: border-box;
        }
        
        .input-group {
          animation: slideIn 0.5s ease-out backwards;
        }
        
        .input-group:nth-child(1) { animation-delay: 0.05s; }
        .input-group:nth-child(2) { animation-delay: 0.1s; }
        .input-group:nth-child(3) { animation-delay: 0.15s; }
        .input-group:nth-child(4) { animation-delay: 0.2s; }
        .input-group:nth-child(5) { animation-delay: 0.25s; }
        .input-group:nth-child(6) { animation-delay: 0.3s; }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .chart-container {
          animation: fadeIn 0.8s ease-out 0.4s backwards;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          marginBottom: '3rem',
          borderBottom: '2px solid #d4af37',
          paddingBottom: '2rem',
        }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            letterSpacing: '-0.02em',
            color: '#d4af37',
          }}>
            Retirement Wealth Projections
          </h1>
          <p style={{
            fontSize: '1.2rem',
            fontFamily: '"Work Sans", sans-serif',
            color: '#c4c4b8',
            margin: 0,
            fontWeight: '400',
          }}>
            Monte Carlo Analysis with Alberta Tax Considerations
          </p>
        </div>

        {/* Input Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem',
        }}>
          {[
            { label: 'Current Age', field: 'currentAge', suffix: 'years' },
            { label: 'Current Income', field: 'currentIncome', prefix: '$' },
            { label: 'Retirement Savings Rate', field: 'savingsToRetirement', suffix: '%' },
            { label: 'Investment Savings Rate', field: 'savingsToInvestment', suffix: '%' },
            { label: 'Home Value', field: 'homeValue', prefix: '$' },
            { label: 'Home Appreciation Rate', field: 'homeAppreciationRate', suffix: '%/yr' },
            { label: 'Market Return Rate', field: 'marketReturn', suffix: '%/yr' },
            { label: 'Inflation Rate', field: 'inflationRate', suffix: '%/yr' },
            { label: 'Retirement Age', field: 'retirementAge', suffix: 'years' },
            { label: 'Retirement Income Need', field: 'retirementIncomePercent', suffix: '%' },
            { label: 'Monte Carlo Simulations', field: 'numSimulations', suffix: 'runs' },
          ].map(({ label, field, prefix, suffix }) => (
            <div key={field} className="input-group">
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.9rem',
                fontFamily: '"Work Sans", sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#a8a89d',
                fontWeight: '500',
              }}>
                {label}
              </label>
              <div style={{ position: 'relative' }}>
                {prefix && (
                  <span style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#d4af37',
                    fontFamily: '"Work Sans", sans-serif',
                    fontWeight: '600',
                  }}>
                    {prefix}
                  </span>
                )}
                <input
                  type="number"
                  value={inputs[field]}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  step={field.includes('Rate') || field.includes('Percent') ? '0.1' : '1'}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    paddingLeft: prefix ? '2rem' : '1rem',
                    paddingRight: suffix ? '3.5rem' : '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '4px',
                    fontSize: '1.1rem',
                    fontFamily: '"Work Sans", sans-serif',
                    color: '#f5f5f0',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#d4af37';
                    e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                />
                {suffix && (
                  <span style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#a8a89d',
                    fontFamily: '"Work Sans", sans-serif',
                    fontSize: '0.9rem',
                  }}>
                    {suffix}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="chart-container" style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: '8px',
          padding: '2rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: '600',
            marginTop: 0,
            marginBottom: '1.5rem',
            color: '#d4af37',
          }}>
            Net Worth Projection
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={percentileData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="age" 
                stroke="#a8a89d"
                style={{ fontFamily: '"Work Sans", sans-serif', fontSize: '0.85rem' }}
                label={{ value: 'Age', position: 'insideBottom', offset: -5, fill: '#a8a89d' }}
              />
              <YAxis 
                stroke="#a8a89d"
                style={{ fontFamily: '"Work Sans", sans-serif', fontSize: '0.85rem' }}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                label={{ value: 'Net Worth', angle: -90, position: 'insideLeft', fill: '#a8a89d' }}
              />
              <Tooltip 
                contentStyle={{
                  background: 'rgba(0, 0, 0, 0.9)',
                  border: '1px solid #d4af37',
                  borderRadius: '4px',
                  fontFamily: '"Work Sans", sans-serif',
                }}
                labelStyle={{ color: '#d4af37', marginBottom: '0.5rem' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend 
                wrapperStyle={{
                  fontFamily: '"Work Sans", sans-serif',
                  fontSize: '0.9rem',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="p10" 
                stroke="#8b4513" 
                strokeWidth={1.5}
                dot={false}
                name="10th Percentile"
              />
              <Line 
                type="monotone" 
                dataKey="p25" 
                stroke="#cd853f" 
                strokeWidth={1.5}
                dot={false}
                name="25th Percentile"
              />
              <Line 
                type="monotone" 
                dataKey="p50" 
                stroke="#daa520" 
                strokeWidth={2}
                dot={false}
                name="Median"
              />
              <Line 
                type="monotone" 
                dataKey="baseCase" 
                stroke="#d4af37" 
                strokeWidth={3}
                dot={false}
                name="Base Case"
                strokeDasharray="5 5"
              />
              <Line 
                type="monotone" 
                dataKey="p75" 
                stroke="#f0e68c" 
                strokeWidth={1.5}
                dot={false}
                name="75th Percentile"
              />
              <Line 
                type="monotone" 
                dataKey="p90" 
                stroke="#fafad2" 
                strokeWidth={1.5}
                dot={false}
                name="90th Percentile"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Statistics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          {(() => {
            const retirementYearIndex = percentileData.findIndex(d => d.age === inputs.retirementAge);
            const finalYearIndex = percentileData.length - 1;
            
            if (retirementYearIndex === -1) return null;
            
            const retirementData = percentileData[retirementYearIndex];
            const finalData = percentileData[finalYearIndex];
            
            return [
              { label: 'Net Worth at Retirement', value: retirementData.baseCase },
              { label: 'Net Worth at Age 95', value: finalData.baseCase },
              { label: 'Median at Retirement', value: retirementData.p50 },
              { label: 'Median at Age 95', value: finalData.p50 },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '6px',
                padding: '1.5rem',
              }}>
                <div style={{
                  fontSize: '0.85rem',
                  fontFamily: '"Work Sans", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#a8a89d',
                  marginBottom: '0.5rem',
                }}>
                  {label}
                </div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: '#d4af37',
                }}>
                  {formatCurrency(value)}
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Toggle Tables Button */}
        <button
          onClick={() => setShowTables(!showTables)}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'rgba(212, 175, 55, 0.15)',
            border: '1px solid #d4af37',
            borderRadius: '6px',
            color: '#d4af37',
            fontSize: '1rem',
            fontFamily: '"Work Sans", sans-serif',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '2rem',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(212, 175, 55, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(212, 175, 55, 0.15)';
          }}
        >
          {showTables ? '▼ Hide Detailed Tables' : '▶ Show Detailed Tables'}
        </button>

        {/* Detailed Tables */}
        {showTables && (
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              color: '#d4af37',
            }}>
              Detailed Projections
            </h2>
            
            {/* Base Case Table */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: '8px',
              padding: '2rem',
              marginBottom: '2rem',
              overflowX: 'auto',
            }}>
              <h3 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginTop: 0,
                marginBottom: '1rem',
                color: '#d4af37',
              }}>
                Base Case (Deterministic)
              </h3>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: '"Work Sans", sans-serif',
                fontSize: '0.9rem',
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #d4af37' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#d4af37' }}>Age</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#d4af37' }}>Year</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#d4af37' }}>Income</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#d4af37' }}>Retirement</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#d4af37' }}>Investment</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#d4af37' }}>Home Value</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#d4af37' }}>Net Worth</th>
                  </tr>
                </thead>
                <tbody>
                  {simulations[0].data.map((row, i) => (
                    <tr 
                      key={i}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        background: row.isRetired ? 'rgba(139, 69, 19, 0.1)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '0.75rem', color: '#f5f5f0' }}>{row.age}</td>
                      <td style={{ padding: '0.75rem', color: '#c4c4b8' }}>{row.year}</td>
                      <td style={{ 
                        padding: '0.75rem', 
                        textAlign: 'right',
                        color: row.income < 0 ? '#cd5c5c' : '#90ee90',
                      }}>
                        {formatCurrency(row.income)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#f5f5f0' }}>
                        {formatCurrency(row.retirementAccount)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#f5f5f0' }}>
                        {formatCurrency(row.investmentAccount)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#f5f5f0' }}>
                        {formatCurrency(row.homeValue)}
                      </td>
                      <td style={{ 
                        padding: '0.75rem', 
                        textAlign: 'right',
                        color: '#d4af37',
                        fontWeight: '600',
                      }}>
                        {formatCurrency(row.netWorth)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Percentile Summary Table */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: '8px',
              padding: '2rem',
              overflowX: 'auto',
            }}>
              <h3 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginTop: 0,
                marginBottom: '1rem',
                color: '#d4af37',
              }}>
                Monte Carlo Percentiles
              </h3>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: '"Work Sans", sans-serif',
                fontSize: '0.9rem',
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #d4af37' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#d4af37' }}>Age</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#d4af37' }}>Year</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#d4af37' }}>10th %ile</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#d4af37' }}>25th %ile</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#d4af37' }}>Median</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#d4af37' }}>75th %ile</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#d4af37' }}>90th %ile</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: '#d4af37' }}>Base Case</th>
                  </tr>
                </thead>
                <tbody>
                  {percentileData.map((row, i) => (
                    <tr 
                      key={i}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        background: row.age >= inputs.retirementAge ? 'rgba(139, 69, 19, 0.1)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '0.75rem', color: '#f5f5f0' }}>{row.age}</td>
                      <td style={{ padding: '0.75rem', color: '#c4c4b8' }}>{row.year}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#f5f5f0' }}>
                        {formatCurrency(row.p10)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#f5f5f0' }}>
                        {formatCurrency(row.p25)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#f5f5f0' }}>
                        {formatCurrency(row.p50)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#f5f5f0' }}>
                        {formatCurrency(row.p75)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#f5f5f0' }}>
                        {formatCurrency(row.p90)}
                      </td>
                      <td style={{ 
                        padding: '0.75rem', 
                        textAlign: 'right',
                        color: '#d4af37',
                        fontWeight: '600',
                      }}>
                        {formatCurrency(row.baseCase)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetirementPlanner;
