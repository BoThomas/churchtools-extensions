# ChurchTools Translator

Real-time speech-to-text translation for church services and events, powered by Microsoft Azure Cognitive Services.

> [!WARNING]
> As the Presentation Mode is also embedded in the ChurchTools interface, there could be problems with
> Pop-ups or other conditional overlays not being suppressed. This needs to be tested further.

## What is it?

The Translator extension enables real-time translation of spoken language during church services. It's perfect for multilingual congregations where members may not understand the primary language of the service.

**Example Use Case**: Your church has German-speaking visitors during an English service. A translator speaks into a microphone, and the translation appears instantly on a screen.

## Features

### 🎤 Real-Time Speech Recognition

- Captures speech and converts it to text in real-time
- Supports multiple input languages
- Translates speech into multiple target languages
- Works with any microphone input going into a PC running ChurchTools-Website

### 📺 Presentation Mode

- Full-screen display optimized for projection
- Customizable font size, colors, and styling
- Clean, distraction-free interface

### 📊 Session Logging

- Track usage statistics per session
- Review translation history
- Monitor API usage

## How It Works

1. **Configure** your Azure Speech API credentials in the Settings tab
2. **Select** your source and target languages
3. **Start** the presentation mode
4. **Speak** into the microphone - text appears on screen in real-time

## Requirements

- A ChurchTools instance with Extension support
- Microsoft Azure Cognitive Services account (Speech Services)
- A microphone for the speaker/translator plugged into the PC running ChurchTools-Website
- A screen or projector for displaying translations

## Azure Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a "Speech Services" resource (part of Cognitive Services)
3. Navigate to "Keys and Endpoint" under the resource overview
4. Copy one of the keys and the region
5. Enter them in the extension's Settings tab
