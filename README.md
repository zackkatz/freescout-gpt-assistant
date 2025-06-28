# FreeScout GPT Assistant

A powerful Chrome extension that integrates OpenAI's GPT models with FreeScout to generate intelligent, context-aware customer support responses. Features advanced documentation integration, customer data extraction, and tone matching for personalized support.

## 🚀 Features

### Core AI Integration
- **GPT-4 Support**: Use GPT-4o, GPT-4 Turbo, or GPT-3.5 Turbo models
- **Smart Context Building**: Automatically extracts conversation history and customer information
- **Tone Matching**: Analyzes your previous responses to maintain consistent communication style
- **Customizable System Prompts**: Define your support agent's personality and guidelines

### Documentation Integration
- **llms.txt Support**: Automatically fetch and include relevant documentation in AI responses
- **Smart Caching**: 24-hour cache with manual refresh capability
- **Cache Management**: Visual cache status indicators and manual clearing
- **Multiple Sources**: Support for any documentation URL following llms.txt format

### Customer Intelligence (WordPress Integration)
When used with the [WordPressFreeScout module](https://github.com/verygoodplugins/WordPressFreeScout), the extension automatically extracts and includes:

- **Customer Profile**: Name, registration date, CRM system
- **Product Information**: Current plugin version with update recommendations
- **License Details**: Status, expiration dates, active sites count
- **Purchase History**: Recent orders, amounts, and payment methods
- **Technical Context**: Active integrations, CRM tags, site URLs
- **Support Context**: Last license check, version status warnings

### Advanced Configuration
- **Temperature Control**: Adjust response creativity (0.1 = consistent, 0.9 = creative)
- **Token Limits**: Control response length and API costs (50-4000 tokens)
- **Custom Shortcuts**: Configurable keyboard shortcuts (default: Ctrl+Shift+G)
- **Model Selection**: Choose the best OpenAI model for your needs
- **Error Handling**: Detailed error messages for troubleshooting

### User Experience
- **Visual Feedback**: "🤖 Generating AI response..." status indicator
- **Markdown Support**: Automatic conversion of links and bold text
- **Summernote Integration**: Native support for FreeScout's WYSIWYG editor
- **Personalized Signatures**: Automatic sign-offs using agent names

## 📦 Installation

1. **Download the Extension**
   - Clone this repository or download as ZIP
   - Extract to a local folder

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select the extension folder

3. **Get OpenAI API Key**
   - Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Create a new API key
   - Copy the key for configuration

## ⚙️ Configuration

### Basic Setup

1. **Click the extension icon** in your Chrome toolbar
2. **Configure required settings**:
   - **OpenAI API Key**: Your API key from OpenAI
   - **OpenAI Model**: Choose GPT-4o (recommended), GPT-4 Turbo, or GPT-3.5 Turbo
   - **System Prompt**: Customize the AI's behavior and tone
   - **Keyboard Shortcut**: Default is Ctrl+Shift+G (Cmd+Shift+G on Mac)

### Advanced Settings

- **Temperature**: Control response creativity
  - `0.1` = Very consistent, predictable responses
  - `0.7` = Balanced (default)
  - `0.9` = More creative, varied responses

- **Max Tokens**: Control response length (50-4000)
  - `500` = Short responses
  - `1000` = Medium responses (default)
  - `2000+` = Longer, detailed responses

## 💰 Cost Estimation

Based on OpenAI's current pricing (as of 2025) and assuming an average conversation thread of 6 messages with customer data and documentation:

### Typical Usage Scenario
- **Input**: ~2,000 tokens (conversation history + customer data + documentation)
- **Output**: ~300 tokens (generated response)
- **Total per response**: ~2,300 tokens

### Cost per Response by Model

| Model | Input Cost | Output Cost | Total Cost per Response |
|-------|------------|-------------|------------------------|
| **GPT-4o** | $0.0025 per 1K tokens | $0.01 per 1K tokens | **~$0.008** |
| **GPT-4 Turbo** | $0.01 per 1K tokens | $0.03 per 1K tokens | **~$0.029** |
| **GPT-3.5 Turbo** | $0.0005 per 1K tokens | $0.0015 per 1K tokens | **~$0.001** |

### Monthly Cost Examples

**Light Usage** (50 responses/month):
- GPT-4o: ~$0.40/month
- GPT-4 Turbo: ~$1.45/month  
- GPT-3.5 Turbo: ~$0.05/month

**Medium Usage** (200 responses/month):
- GPT-4o: ~$1.60/month
- GPT-4 Turbo: ~$5.80/month
- GPT-3.5 Turbo: ~$0.20/month

**Heavy Usage** (500 responses/month):
- GPT-4o: ~$4.00/month
- GPT-4 Turbo: ~$14.50/month
- GPT-3.5 Turbo: ~$0.50/month

### Cost Optimization Tips

1. **Choose the Right Model**:
   - GPT-4o: Best balance of quality and cost (recommended)
   - GPT-4 Turbo: Highest quality, highest cost
   - GPT-3.5 Turbo: Most economical, good for simple responses

2. **Optimize Token Usage**:
   - Set appropriate max_tokens limits (500-1000 for most responses)
   - Use concise system prompts
   - Keep documentation focused and relevant

3. **Monitor Usage**:
   - Check your OpenAI usage dashboard regularly
   - Set up billing alerts in your OpenAI account
   - Track response quality vs. cost for your use case

*Note: Prices are subject to change. Check [OpenAI's pricing page](https://openai.com/pricing) for current rates.*

### Documentation Integration

1. **Prepare Documentation**
   - Create an `llms.txt` file with your documentation
   - Host it on a publicly accessible URL
   - Format: [llms.txt specification](https://llmstxt.org/)

2. **Configure Docs URL**
   - Add your documentation URL in the extension settings
   - The extension will automatically cache and include relevant docs

**Example llms.txt format:**
```
# Product Setup Guide
URL: https://example.com/setup

Step-by-step instructions for setting up the product...

# Troubleshooting Common Issues
URL: https://example.com/troubleshooting

Solutions for frequently encountered problems...
```

## 🔌 WordPress Integration

This extension works seamlessly with the [WordPressFreeScout module](https://github.com/verygoodplugins/WordPressFreeScout) by Very Good Plugins to provide enhanced customer intelligence.

### What the WordPress Module Provides

The WordPressFreeScout module displays customer information in FreeScout's sidebar, which this extension automatically extracts and includes in AI responses:

- **Customer Profile Data**
- **EDD (Easy Digital Downloads) Order History**
- **Software License Information**
- **Active Plugin Integrations**
- **CRM Tags and Segmentation**
- **Version Status and Update Recommendations**

### Installation Requirements

1. **Install WordPressFreeScout Module**
   - Follow instructions at [verygoodplugins/WordPressFreeScout](https://github.com/verygoodplugins/WordPressFreeScout)
   - Configure the WordPress connection in FreeScout

2. **Verify Integration**
   - Ensure customer data appears in FreeScout's conversation sidebar
   - The extension will automatically detect and extract this information

### Supported Data Extraction

The extension intelligently parses the WordPress widget to extract:

```html
<!-- Customer Basic Info -->
- Customer Name: Kyle Newton
- Registered: 04/18/2022
- Active CRM: Groundhogg (This Site)
- Current Version: 3.41.41 (with update warnings)

<!-- License Information -->
- License Status: Active
- Expires: 04/18/2026
- Active Sites: 150+ sites
- Sample Sites: my.tribepub.com, wellhealthcenters.com, etc.

<!-- Purchase History -->
- Recent Orders: Renewals, amounts, dates
- Product: WP Fusion — Professional
- Payment Method: Stripe

<!-- Technical Context -->
- Active Integrations: EDD, WooCommerce, Gravity Forms, etc.
- CRM Tags: Customer segments and status
```

## 🎯 Usage

### Generating Responses

1. **Open a FreeScout conversation**
2. **Press your configured shortcut** (default: Ctrl+Shift+G)
3. **Wait for generation** - you'll see "🤖 Generating AI response..."
4. **Review and edit** the generated response as needed
5. **Send the response** using FreeScout's normal send button

### Best Practices

**System Prompt Tips:**
```
You are a helpful customer support agent for [Company Name]. 

Guidelines:
- Be authoritative yet approachable
- Reference documentation when applicable
- Use customer's name when known
- Provide specific solutions, not generic advice
- End with an offer to help further

When referencing documentation, format as: [Link Text](URL)
```

**Documentation Organization:**
- Keep sections focused and specific
- Include URLs for each section
- Update regularly to maintain accuracy
- Test with common customer scenarios

**Customer Context Usage:**
- The extension automatically includes customer data in prompts
- AI responses will be personalized with customer names
- Version warnings and license status are automatically considered
- Purchase history provides context for renewal discussions

## 🛠️ Advanced Features

### Tone Matching

The extension analyzes your previous responses in conversations to maintain consistency:
- Extracts your communication style from past messages
- Matches formality level and language patterns
- Maintains your personal support voice across conversations

### Error Handling

Comprehensive error reporting helps with troubleshooting:
- API key validation before requests
- Detailed OpenAI API error messages
- Network and configuration issue detection
- Helpful suggestions for common problems

### Cache Management

Smart caching reduces API calls and improves performance:
- 24-hour cache for documentation
- Visual cache status indicators
- Manual cache clearing capability
- Automatic cache busting for fresh content

## 🔧 Troubleshooting

### Common Issues

**"No OpenAI API key configured"**
- Ensure you've entered your API key in settings
- Check for extra spaces or formatting issues

**"API Error (401): Invalid API key"**
- Verify your OpenAI API key is correct
- Check that your OpenAI account has sufficient credits

**"API Error (429): Rate limit exceeded"**
- You've exceeded OpenAI's rate limits
- Wait a few minutes or upgrade your OpenAI plan

**No customer data appearing**
- Ensure WordPressFreeScout module is installed and configured
- Verify customer data appears in FreeScout's sidebar
- Check browser console for JavaScript errors

### Debug Information

Enable Chrome DevTools Console to see detailed logs:
1. Press F12 in FreeScout
2. Go to Console tab
3. Trigger the extension and review any error messages

## 📋 Requirements

- **Chrome Browser**: Version 88+ (Manifest V3 support)
- **FreeScout**: Any recent version
- **OpenAI Account**: With API access and credits
- **WordPressFreeScout Module**: Optional, for enhanced customer data

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup

1. Clone the repository
2. Make your changes
3. Test thoroughly in a FreeScout environment
4. Submit a pull request with detailed description

## 📄 License

This project is open source. Please check the license file for details.

## 🙏 Acknowledgments

- **Very Good Plugins** for the [WordPressFreeScout module](https://github.com/verygoodplugins/WordPressFreeScout)
- **OpenAI** for providing the GPT API
- **FreeScout** for the excellent help desk platform

## 📞 Support

For issues with this extension:
- Open an issue on GitHub
- Include browser console errors
- Describe your FreeScout and WordPress setup

For issues with the WordPressFreeScout module:
- Visit [verygoodplugins/WordPressFreeScout](https://github.com/verygoodplugins/WordPressFreeScout)
- Follow their support guidelines

---

**Made with ❤️ for the FreeScout community** 