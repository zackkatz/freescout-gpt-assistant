# FreeScout GPT Assistant

A powerful Chrome extension that integrates OpenAI's GPT models with FreeScout to generate intelligent, context-aware customer support responses. Features advanced documentation integration, customer data extraction, and tone matching for personalized support.

## 🚀 Features

### Core AI Integration
- **GPT-5 Support**: Use the latest GPT-5 family (GPT-5, GPT-5 Mini, GPT-5 Nano)
- **GPT-4 Support**: Also supports GPT-4o, GPT-4 Turbo, and GPT-3.5 Turbo models
- **Smart Context Building**: Automatically extracts conversation history and customer information
- **Tone Matching**: Analyzes your previous responses to maintain consistent communication style
- **Customizable System Prompts**: Define your support agent's personality and guidelines
- **Fast Responses**: Optimized prompts and context handling for quick replies
- **Optimized for Speed**: GPT-5 models configured with low reasoning effort and verbosity for quick responses

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
- **Optional Context Input**: Type context/notes in the reply field before generation
 
- **Markdown Support**: Automatic conversion of links and bold text
- **Summernote Integration**: Native support for FreeScout's WYSIWYG editor
- **Personalized Signatures**: Automatic sign-offs using agent names

<img width="1504" alt="image" src="https://github.com/user-attachments/assets/2c64dc3d-bf49-4394-a684-e72252791e88" />


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
   - **OpenAI Model**: Choose from GPT-5 (latest, fast), GPT-5 Mini, GPT-5 Nano, GPT-4o, GPT-4 Turbo, or GPT-3.5 Turbo
   - **System Prompt**: Customize the AI's behavior and tone
   - **Keyboard Shortcut**: Default is Ctrl+Shift+G (Cmd+Shift+G on Mac)

### Advanced Settings

- **Temperature**: Control response creativity
  - `0.1` = Very consistent, predictable responses
  - `0.7` = Balanced (default)
  - `0.9` = More creative, varied responses
  - Note: For GPT‑5 via the Responses API, this setting is ignored.

- **Max Tokens**: Control response length (50-4000)
  - `500` = Short responses
  - `1000` = Medium responses (default)
  - `2000+` = Longer, detailed responses
  - Note: For GPT‑5 via the Responses API, the extension ignores this setting to avoid capping combined reasoning+text tokens, which can suppress visible output. Legacy models still use it.

- **Enable Feedback System**: Toggle response quality tracking
  - `Checked` = Show thumbs up/down buttons after responses (default)
  - `Unchecked` = Disable feedback collection for cleaner interface

## 💰 Cost Estimation

Based on OpenAI's current pricing (as of 2025) and assuming an average conversation thread of 6 messages with customer data and documentation:

### Typical Usage Scenario
- **Input**: ~2,000 tokens (conversation history + customer data + documentation)
- **Output**: ~300 tokens (generated response)
- **Total per response**: ~2,300 tokens

### Cost per Response by Model

| Model | Input Cost | Output Cost | Total Cost per Response |
|-------|------------|-------------|------------------------|
| **GPT-5** | $0.002 per 1K tokens | $0.008 per 1K tokens | **~$0.006** |
| **GPT-5 Mini** | $0.001 per 1K tokens | $0.004 per 1K tokens | **~$0.003** |
| **GPT-5 Nano** | $0.0005 per 1K tokens | $0.002 per 1K tokens | **~$0.0015** |
| **GPT-4o** | $0.0025 per 1K tokens | $0.01 per 1K tokens | **~$0.008** |
| **GPT-4 Turbo** | $0.01 per 1K tokens | $0.03 per 1K tokens | **~$0.029** |
| **GPT-3.5 Turbo** | $0.0005 per 1K tokens | $0.0015 per 1K tokens | **~$0.001** |

### Monthly Cost Examples

**Light Usage** (50 responses/month):
- GPT-5: ~$0.30/month
- GPT-5 Mini: ~$0.15/month
- GPT-5 Nano: ~$0.08/month
- GPT-4o: ~$0.40/month
- GPT-4 Turbo: ~$1.45/month  
- GPT-3.5 Turbo: ~$0.05/month

**Medium Usage** (200 responses/month):
- GPT-5: ~$1.20/month
- GPT-5 Mini: ~$0.60/month
- GPT-5 Nano: ~$0.30/month
- GPT-4o: ~$1.60/month
- GPT-4 Turbo: ~$5.80/month
- GPT-3.5 Turbo: ~$0.20/month

**Heavy Usage** (500 responses/month):
- GPT-5: ~$3.00/month
- GPT-5 Mini: ~$1.50/month
- GPT-5 Nano: ~$0.75/month
- GPT-4o: ~$4.00/month
- GPT-4 Turbo: ~$14.50/month
- GPT-3.5 Turbo: ~$0.50/month

### Cost Optimization Tips

1. **Choose the Right Model**:
   - GPT-5: Latest model with fast responses
   - GPT-5 Mini: Good balance of speed and cost
   - GPT-5 Nano: Most economical GPT-5 option
   - GPT-4o: Best balance of quality and cost for GPT-4 generation
   - GPT-4 Turbo: Highest quality GPT-4, highest cost
   - GPT-3.5 Turbo: Most economical overall, good for simple responses

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
2. **Optional: Add context** - Type any context or notes in the reply field (e.g., "this was a bug and we fixed it for today's 3.43.3 update")
3. **Press your configured shortcut** (default: Ctrl+Shift+G)
4. **Wait for generation** - you'll see "🤖 Generating AI response..."
5. **Review and edit** the generated response as needed
6. **Send the response** using FreeScout's normal send button

### Using Optional Context

You can provide additional context to help the AI generate more accurate responses:

**Example workflow:**
- **Type in reply field**: "this was a bug and we fixed it for today's 3.43.3 update"
- **Press Ctrl+Shift+G**
- **AI generates**: "Hi John, thanks for reporting this issue. This was indeed a bug that we've addressed in today's 3.43.3 update. Please update to the latest version and the issue should be resolved. Let me know if you need any help with the update process. Best, Sarah"

**Common context examples:**
- "offer 20% discount for renewal"
- "this feature will be available in next month's release"
- "customer is on legacy plan, needs migration"
- "escalate to development team"

### Providing Feedback on AI Responses

After each AI response is generated, you'll see feedback buttons:

**Rate the response:**
- **👍 Good** - Response was helpful and accurate
- **👎 Needs Work** - Response needs improvement

**For negative feedback:**
- Provide specific notes about what could be improved
- Common feedback areas: tone, accuracy, length, context usage

**Feedback Analytics:**
- View success rates and improvement trends in extension settings
- Get personalized suggestions based on your feedback patterns
- Export detailed feedback reports for analysis

## 📊 Response Feedback System

The extension includes an intelligent feedback system to help you track and improve AI response quality over time.

### How It Works

**After each AI response generation:**
1. **Feedback buttons appear** below the reply editor (👍 Good / 👎 Needs Work)
2. **Rate the response** with a single click
3. **Add improvement notes** (optional) for negative feedback
4. **Data is stored locally** in your browser for privacy

### Feedback Analytics Dashboard

**Available in extension settings:**
- **Success Rate**: Percentage of positive vs negative responses (last 30 days)
- **Response Volume**: Total number of rated responses
- **Smart Suggestions**: AI-powered recommendations based on feedback patterns
- **Trend Analysis**: Track improvement over time

### Common Feedback Patterns

The system automatically identifies issues and provides suggestions:

| **Issue Detected** | **Suggested Improvement** |
|-------------------|-------------------------|
| Too formal/robotic | Add "Use a friendly, conversational tone" to system prompt |
| Too casual | Add "Maintain a professional tone" to system prompt |
| Missing context | Provide more specific context before generation |
| Too long/verbose | Reduce max tokens or add "Be concise" to system prompt |
| Too short/incomplete | Increase max tokens or add "Provide detailed explanations" |
| Wrong tone | Review tone instructions and previous message analysis |

### Data Management

**Granular cleanup options in settings:**
- **Clear 30+ days old** - Remove outdated feedback entries
- **Clear 90+ days old** - More aggressive cleanup for storage management
- **Clear negative only** - Focus on positive patterns only
- **Clear all feedback** - Complete reset of feedback data

**Export and Analysis:**
- **View All Feedback Data** - Opens comprehensive HTML report
- **Individual entry details** - Response text, notes, customer context, timestamps
- **Bulk statistics** - Success rates, common issues, improvement trends

### Privacy and Storage

- **Local storage only** - All feedback data stays in your browser
- **No external servers** - Complete privacy and control
- **Automatic cleanup** - Configurable retention periods
- **Export capability** - Take your data with you anytime

### Best Practices

**For optimal feedback insights:**

1. **Rate consistently** - Try to rate most responses for accurate trends
2. **Be specific in notes** - Detailed feedback generates better suggestions
3. **Regular cleanup** - Remove old data monthly to keep insights current
4. **Act on suggestions** - Update system prompts based on recommendations
5. **Monitor trends** - Check analytics weekly to track improvement

**Feedback categories to consider:**
- **Accuracy**: Was the information correct?
- **Tone**: Did it match your communication style?
- **Completeness**: Did it address all customer concerns?
- **Context usage**: Did it incorporate provided context well?
- **Professional quality**: Would you send this response as-is?

### Disabling Feedback

**If you prefer a cleaner interface:**
1. Open extension settings
2. Uncheck "Enable response feedback system"
3. Save settings

The feedback system is **enabled by default** but can be completely disabled if you find it intrusive. All existing feedback data is preserved when disabled and will reappear if you re-enable the feature.

### Best Practices

**System Prompt Tips:**

The extension comes with a default system prompt that you can edit.

Here is the default system prompt:
```
You are a helpful customer support agent for [Company Name]. Please provide clear, concise, and friendly responses to customer inquiries.

Guidelines:
- Be authoritative yet approachable in your tone
- Keep responses concise but complete
- Always reference relevant documentation links when applicable
- Use a helpful, professional tone
- If you mention documentation, include the specific URL
- Structure your response clearly with bullet points or numbered lists when helpful
- Do not make use of markdown headings
- You can make tasteful use of emojis
- End with an offer to help further if needed

When referencing documentation, format links as: [Link Text](URL)
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

### GPT‑5 Integration Tuning

- File: `gpt5.js` contains all GPT‑5 Responses API behavior behind a small helper (`window.GPT5`).
- Tweak these defaults to experiment without affecting legacy integrations:
  - `reasoningEffort`: `'minimal' | 'low' | 'medium' | 'high'` (default: `'high'`)
  - `textFormat`: `'text'` (ensures visible assistant message output)
  - `textVerbosity`: `'medium'`
  - `maxOutputTokens`: `null` (if set, caps reasoning + text together)
  - `toolChoice`, `parallelToolCalls`, `serviceTier`, `store`, `stream`, `include`
- The content script calls `GPT5.buildRequest(...)` and `GPT5.extractReply(...)`. You can also adjust at runtime via the DevTools console:
  - `GPT5.setConfig({ reasoningEffort: 'medium' })`
  - `GPT5.getConfig()`
Note: The legacy response feedback UI has been removed to simplify the experience.

## 📄 License

This project is open source. Please check the license file for details.

## 🙏 Acknowledgments

- **Very Good Plugins** for the [WordPressFreeScout module](https://github.com/verygoodplugins/WordPressFreeScout)
- **OpenAI** for providing the GPT API
- **FreeScout** for the excellent help desk platform

## 📝 Changelog

### Version 1.2.0
- ✅ **NEW: GPT-5 Model Support** - Added support for GPT-5, GPT-5 Mini, and GPT-5 Nano models
- ✅ **NEW: Responses API** - Integrated OpenAI's /v1/responses endpoint for GPT-5 models
- ✅ **IMPROVED: Stability** - Streaming temporarily disabled for GPT‑5 while we validate event formats
- Maintains full backward compatibility with GPT-4 and GPT-3.5 models

### Version 1.1.1 (July 1, 2025)
- ✅ **IMPROVED: Default System Prompt** - Updated to allow tasteful use of emojis and avoid markdown headings
- Enhanced user experience with better formatting guidelines

### Version 1.1.0 (July 1, 2025)
- ✅ **NEW: Optional Context Input** - Type context/notes in the reply field before generating AI responses
- ✅ **NEW: Response Feedback System** - Rate AI responses with thumbs up/down and provide improvement notes
- The AI will incorporate your context into the generated response
- Perfect for providing specific information like "this was fixed in today's update" or "offer 20% discount"
- Context text gets replaced with the full AI-generated response
- Feedback analytics help identify patterns and suggest improvements

### Version 1.0.0 (June 28, 2025)
- Initial release with GPT-4 integration
- WordPress customer data extraction
- Documentation integration with llms.txt support
- Tone matching and personalized signatures
- Smart caching and error handling

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
