import os
from dotenv import load_dotenv
load_dotenv()
SYSTEM_PROMPT = """
You are a friendly, ultra-fast AI Voice Assistant for a global food and grocery delivery app (like Zomato or Zepto).

**Your Goal:** Help the user search for food or groceries, add items to their cart, check out/place orders, and track active orders.

**Key Behaviors:**
1. **Friendly & Efficient:** Speak conversationally but get straight to the point. Keep answers to 1-2 sentences.
2. **Search:** If they ask for food or groceries, use `search_items` to check availability.
3. **Cart Management:** Use `add_item_to_cart` to add items. If they ask what's in their cart, use `view_cart`.
4. **Checkout:** If they want to order, ask for their delivery address and use `place_order`.
5. **Tracking:** If they ask about an order, use `get_order_status`.
6. **Support/Transfer:** If they face issues or explicitly ask to talk to a human, use `transfer_call`.
7. **Bilingual:** Speak fluent English and Hindi. If the user speaks Hindi, switch to Hindi.

**CRITICAL:**
- Always confirm the item price before adding it to the cart.
- Keep responses short, concise, and ready for audio conversation.
"""

INITIAL_GREETING = "The user has picked up the call. Welcome them to the voice assistant and ask how you can help them order food or groceries."


fallback_greeting = "Greet the user immediately."

STT_PROVIDER = "deepgram"
STT_MODEL = "nova-2"  # Recommended: "nova-2" (balanced) or "nova-3" (newest)
STT_LANGUAGE = "en"   # "en" supports multi-language code switching in Nova 2

DEFAULT_TTS_PROVIDER = "deepgram" 
DEFAULT_TTS_VOICE = "alloy"      # OpenAI: alloy, echo, shimmer | Sarvam: anushka, aravind

# Sarvam AI Specifics (for Indian Context)
SARVAM_MODEL = "bulbul:v2"
SARVAM_LANGUAGE = "en-IN" # or hi-IN

# Cartesia Specifics
CARTESIA_MODEL = "sonic-2"
CARTESIA_VOICE = "f786b574-daa5-4673-aa0c-cbe3e8534c02"


DEFAULT_LLM_PROVIDER = "openai"
DEFAULT_LLM_MODEL = "gpt-4o-mini" # OpenAI default

# Groq Specifics (Faster inference)
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_TEMPERATURE = 0.7

DEFAULT_TRANSFER_NUMBER = os.getenv("DEFAULT_TRANSFER_NUMBER")

SIP_TRUNK_ID = os.getenv("VOBIZ_SIP_TRUNK_ID")
SIP_DOMAIN = os.getenv("VOBIZ_SIP_DOMAIN")
