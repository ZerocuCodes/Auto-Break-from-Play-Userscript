# Stake Auto Break In Play Userscript

## ⚠️ CRITICAL WARNING - BREAK IN PLAY IS IRREVERSIBLE

**BREAK IN PLAY IS PERMANENT AND CANNOT BE REVERSED ONCE ACTIVATED**

- Once triggered, your account will be locked from all gambling activities
- No manual override, customer support intervention, or cancellation is possible
- The break will remain active for the full duration you select (1 day, 1 week, or 1 month)
- You will lose access to all betting, casino games, and stake.com features during this period
- **THERE IS NO WAY TO UNDO OR SHORTEN A BREAK IN PLAY ONCE STARTED**

## Overview

This userscript automatically monitors your Stake.com and Stake.us account balance and triggers a "Break in Play" when your balance reaches a configured threshold. It's designed as a responsible gambling tool to help users maintain control over their gaming habits.

## Purpose

The script serves as an automated safety mechanism that:

- Monitors your account balance in real-time
- Automatically activates a gambling break when predefined limits are reached
- Helps prevent impulsive decisions during vulnerable moments
- Provides a structured approach to responsible gambling

## Features

### Balance Monitoring

- Real-time balance checking with configurable intervals (3+ seconds)
- Supports all major cryptocurrencies and fiat currencies
- Automatic currency detection based on your Stake.com region
- Balance priority system (available > main balance > vault)

### Flexible Triggers

- **At/Above Threshold**: Triggers when balance reaches or exceeds your limit
- **At/Below Threshold**: Triggers when balance drops to or below your limit
- Customizable threshold amounts with precision up to 8 decimal places

### Break Duration Options

- **1 Day**: 24-hour break period
- **1 Week**: 7-day break period
- **1 Month**: 30-day break period

### User Interface

- Draggable control panel with minimize/maximize functionality
- Real-time status indicators and countdown timers
- Live balance display and threshold monitoring
- Debug console for troubleshooting
- Dark theme matching Stake.com aesthetics

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Click the raw userscript file or copy the entire script
3. Create a new userscript in Tampermonkey
4. Paste the script and save
5. Visit any Stake.com domain to activate

## Supported Domains

- stake.com
- stake.us
- stake.ac
- stake.games
- stake.bet
- stake.pet
- stake.mba
- stake.jp
- stake.bz
- stake.ceo
- stake.krd
- staketr.com
- stake1001.com through stake1022.com
- stake.br

## Configuration

### Basic Setup

1. **Balance Threshold**: Set your trigger amount (e.g., 100, 0.5, 1000)
2. **Trigger Direction**: Choose "At/Above" or "At/Below"
3. **Currency**: Select from 70+ supported currencies or "Auto"
4. **Break Duration**: Choose 1 day, 1 week, or 1 month
5. **Check Interval**: Set balance check frequency (minimum 3 seconds)

### Advanced Settings

- **Session Header**: Enable for better API authentication
- **Debug Mode**: Enable detailed logging for troubleshooting
- **UI Position**: Panel position is automatically saved

## Usage Instructions

### Starting the Monitor

1. Configure your desired settings in the control panel
2. Click "Start" to begin monitoring
3. **CRITICAL**: Review the confirmation dialog carefully
4. Confirm your understanding that Break in Play is irreversible
5. Monitoring will begin immediately

### During Monitoring

- The script checks your balance at the configured interval
- Current balance and threshold are displayed in real-time
- A countdown timer shows seconds until the next check
- Status indicators show monitoring state and balance trends

### When Triggered

- Break in Play is automatically activated via Stake.com API
- Monitoring immediately stops to prevent duplicate triggers
- Your account is locked for the selected duration
- The script displays confirmation with break expiration time
- **NO FURTHER ACTION IS POSSIBLE**

## Technical Details

### API Integration

- Uses Stake.com GraphQL API for balance queries and break activation
- Implements multiple balance query methods for reliability
- Session cookie authentication for secure API access
- Network request interception for passive balance monitoring

### Currency Support

- **Crypto**: BTC, ETH, LTC, DOGE, BCH, XRP, TRX, EOS, BNB, USDT, USDC, DAI, BUSD, APE, CRO, LINK, POL, SAND, SHIB, SOL, TRUMP, UNI
- **Fiat**: USD, EUR, GBP, JPY, CAD, AUD, and 50+ more currencies
- **Sweepstakes**: SWEEPS (Stake.us), GOLD
- **Auto-detection**: Automatically selects appropriate currency based on domain and cookies

### Error Handling

- Graceful handling of network failures and API errors
- Fallback to cached balance data during outages
- Comprehensive logging for debugging
- Automatic retry mechanisms for failed requests

## Safety Considerations

### ⚠️ EXTREME CAUTION REQUIRED

1. **Test Thoroughly**: Use "Check Now" button to verify balance detection before enabling
2. **Start Conservative**: Set initial thresholds far from your normal balance range
3. **Verify Currency**: Ensure correct currency is selected before activation
4. **Double-Check Settings**: Review all parameters in the confirmation dialog
5. **Understand Consequences**: Break affects your entire account access

### Recommended Testing Procedure

1. Set threshold to an impossible amount (e.g., 1,000,000 for "above" or 0 for "below")
2. Enable monitoring for 5-10 minutes
3. Verify balance detection and display accuracy
4. Stop monitoring and adjust threshold to your actual limit
5. Review confirmation dialog carefully before final activation

## Troubleshooting

### Common Issues

- **Balance Not Detected**: Enable debug mode and check console logs
- **Currency Mismatch**: Verify currency selection matches your account
- **API Failures**: Ensure session header is enabled and you're logged in
- **Panel Not Visible**: Check browser extensions for conflicts

### Debug Mode

Enable debug mode to see:

- Detailed balance query attempts
- API response parsing
- Network request monitoring
- Trigger evaluation logic

## Development

### Script Structure

- Configuration management with localStorage persistence
- Modular balance detection and currency handling
- GraphQL API integration with proper error handling
- Dynamic UI creation with event-driven updates
- Network interception for passive monitoring

### Key Functions

- `fetchBalance()`: Multi-method balance retrieval
- `shouldTrigger()`: Threshold evaluation logic
- `startBreakInPlay()`: API call for break activation
- `patchNetworkObservers()`: Passive balance monitoring
- `createControlPanel()`: Dynamic UI generation

## Disclaimer

This userscript is provided as-is for educational and responsible gambling purposes. The author is not responsible for:

- Accidental or premature break activation
- Financial losses due to incorrect configuration
- Account access issues during break periods
- Changes to Stake.com API that affect functionality

**Users assume full responsibility for understanding and accepting the irreversible nature of Break in Play before using this script.**

## Support

For issues, bug reports, or feature requests:

- Check debug mode logs for technical details
- Verify your configuration matches your intended behavior
- Ensure you understand the irreversible nature of break activation

## Donation

If you find this script helpful, consider supporting development:

- XRP Address: `rzerQXq1nrGakfA9DYcMDVsoAF3KPK6e1`

---

**REMEMBER: BREAK IN PLAY IS PERMANENT. ONCE ACTIVATED, IT CANNOT BE REVERSED, CANCELLED, OR SHORTENED BY ANY MEANS.**
