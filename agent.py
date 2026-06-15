import os
import certifi

# Fix for macOS SSL Certificate errors - MUST be before other imports
os.environ['SSL_CERT_FILE'] = certifi.where()

import logging
import json
import random
from dotenv import load_dotenv

from livekit import agents, api
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    openai,
    cartesia,
    deepgram,
    noise_cancellation,
    silero,
    sarvam,
)
from livekit.agents import llm
from typing import Annotated, Optional

# Load environment variables
load_dotenv(".env")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("outbound-agent")

import config


def _build_tts(config_provider: str = None, config_voice: str = None):
    """Configure the Text-to-Speech provider based on env vars or dynamic config."""
    valid_tts_providers = ["cartesia", "sarvam", "deepgram", "openai"]

    provider = None
    if config_provider and config_provider.lower() in valid_tts_providers:
        provider = config_provider.lower()

    if not provider:
        provider = os.getenv("TTS_PROVIDER", config.DEFAULT_TTS_PROVIDER).lower()

    # If using Sarvam Voice names, force Sarvam provider
    if config_voice in ["anushka", "aravind", "amartya", "dhruv"]:
        provider = "sarvam"

    # Fallback to Deepgram if selected provider's credentials are missing
    if provider == "openai":
        logger.info(f"Using OpenAI TTS (Voice: {config_voice})")
        model = os.getenv("OPENAI_TTS_MODEL", "tts-1")
        voice = config_voice or os.getenv("OPENAI_TTS_VOICE", config.DEFAULT_TTS_VOICE)
        return openai.TTS(model=model, voice=voice)


    if provider == "deepgram":
        logger.info("Using Deepgram TTS")
        model = os.getenv("DEEPGRAM_TTS_MODEL", "aura-asteria-en")
        return deepgram.TTS(model=model)

    logger.info("Using Deepgram TTS (default fallback)")
    model = os.getenv("DEEPGRAM_TTS_MODEL", "aura-asteria-en")
    return deepgram.TTS(model=model)


def _build_llm(config_provider: str = None):
    """Configure the LLM provider based on config or env vars."""
    provider = (config_provider or os.getenv("LLM_PROVIDER", config.DEFAULT_LLM_PROVIDER)).lower()

    # Fallback to Groq if OpenAI credentials are missing but Groq is available
    if provider == "openai" and not os.getenv("OPENAI_API_KEY"):
        if os.getenv("GROQ_API_KEY"):
            logger.warning("OPENAI_API_KEY is missing. Falling back to Groq LLM.")
            provider = "groq"

    if provider == "groq":
        logger.info("Using Groq LLM")
        return openai.LLM(
            base_url="https://api.groq.com/openai/v1",
            api_key=os.getenv("GROQ_API_KEY"),
            model=os.getenv("GROQ_MODEL", config.GROQ_MODEL),
            temperature=float(os.getenv("GROQ_TEMPERATURE", str(config.GROQ_TEMPERATURE))),
        )

    # Default to OpenAI
    logger.info("Using OpenAI LLM")
    return openai.LLM(model=config.DEFAULT_LLM_MODEL)


class FoodOrderingFunctions(llm.ToolContext):
    def __init__(self, ctx: agents.JobContext, phone_number: str = None):
        super().__init__(tools=[])
        self.ctx = ctx
        self.phone_number = phone_number
        self.cart = []  # Format: [{"name": str, "price": int, "quantity": int}]

        # Mock Menu (Food & Groceries)
        self.menu = {
            "pizza": [
                {"name": "Margherita Pizza", "price": 299, "desc": "Classic cheese and tomato pizza"},
                {"name": "Pepperoni Pizza", "price": 399, "desc": "Spiced pepperoni with mozzarella"},
                {"name": "Veggie Deluxe Pizza", "price": 349, "desc": "Loaded with onions, bell peppers, and olives"},
            ],
            "burger": [
                {"name": "Veggie Burger", "price": 149, "desc": "Crispy potato patty with fresh veggies and mayo"},
                {"name": "Chicken Burger", "price": 199, "desc": "Grilled chicken patty with cheddar cheese"},
                {"name": "Cheese Burger Supreme", "price": 229, "desc": "Double beef patty with melted cheese"},
            ],
            "grocery": [
                {"name": "Milk 1L", "price": 60, "desc": "Fresh pasteurized whole milk"},
                {"name": "Bread (Brown)", "price": 40, "desc": "Whole wheat sliced bread"},
                {"name": "Eggs 6-pack", "price": 50, "desc": "Farm fresh organic eggs"},
                {"name": "Banana 1 dozen", "price": 70, "desc": "Sweet ripe bananas"},
            ],
            "drink": [
                {"name": "Coca-Cola 500ml", "price": 40, "desc": "Chilled soft drink"},
                {"name": "Chilled Mineral Water", "price": 20, "desc": "Pure mineral drinking water"},
                {"name": "Mango Smoothie", "price": 120, "desc": "Fresh mango pulp blend"},
            ],
        }

    #  FIX 1: async + Annotated description for proper OpenAI schema generation
    @llm.function_tool(description="Search for food or grocery items on the menu or catalogue.")
    async def search_items(
        self,
        query: Annotated[
            str,
            "The food, drink, or grocery item to search for, e.g. 'burger', 'pizza', 'milk'",
        ],
    ) -> str:
        logger.info(f"Searching menu for query: {query}")
        query_lower = query.lower()
        matches = []

        for category, items in self.menu.items():
            for item in items:
                if query_lower in item["name"].lower() or query_lower in category:
                    matches.append(item)

        if not matches:
            return f"I couldn't find any items matching '{query}' on our menu right now."

        result_text = "Here are the matching items I found:\n"
        for idx, item in enumerate(matches, 1):
            result_text += f"{idx}. {item['name']} - ₹{item['price']} ({item['desc']})\n"

        return result_text

    #  FIX 2: async + Annotated description
    @llm.function_tool(description="Add a specific food or grocery item to the user's cart.")
    async def add_item_to_cart(
        self,
        item_name: Annotated[
            str,
            "The exact name of the item to add, e.g. 'Margherita Pizza' or 'Veggie Burger'",
        ],
        quantity: Annotated[
            int,
            "The number of units to add to the cart, defaults to 1",
        ] = 1,
    ) -> str:
        logger.info(f"Adding to cart: {item_name} (Qty: {quantity})")
        item_lower = item_name.lower()
        target_item = None

        for category, items in self.menu.items():
            for item in items:
                if item_lower in item["name"].lower():
                    target_item = item
                    break
            if target_item:
                break

        if not target_item:
            return f"Sorry, I couldn't find '{item_name}' in our catalog. Please search first to find the exact name."

        self.cart.append({
            "name": target_item["name"],
            "price": target_item["price"],
            "quantity": quantity,
        })

        total = sum(i["price"] * i["quantity"] for i in self.cart)
        return (
            f"Added {quantity} x {target_item['name']} (₹{target_item['price']} each) to your cart. "
            f"Current cart total is ₹{total}."
        )

    #  FIX 3: async
    @llm.function_tool(description="View the current items and total cost in the shopping cart.")
    async def view_cart(self) -> str:
        logger.info("Viewing cart items.")
        if not self.cart:
            return "Your cart is currently empty. You can add items like pizza, burgers, or groceries."

        cart_list = "Your cart contains:\n"
        total = 0
        for item in self.cart:
            cost = item["price"] * item["quantity"]
            cart_list += f"- {item['quantity']} x {item['name']} (₹{cost})\n"
            total += cost

        cart_list += f"Total: ₹{total}"
        return cart_list

    #  FIX 4: async + Annotated description
    @llm.function_tool(description="Place the order and complete the checkout process.")
    async def place_order(
        self,
        delivery_address: Annotated[
            str,
            "The full delivery address where the order should be sent, e.g. '123 Park Street'",
        ],
    ) -> str:
        logger.info(f"Placing order for address: {delivery_address}")
        if not self.cart:
            return "Your cart is empty. Please add some items to your cart before placing an order."

        total = sum(i["price"] * i["quantity"] for i in self.cart)
        order_id = f"Z-{random.randint(100000, 999999)}"
        self.cart = []  # Clear cart after checkout

        return (
            f"Success! Order placed successfully. Order ID: #{order_id}. "
            f"Total amount: ₹{total}. Your order will be delivered to '{delivery_address}' "
            f"in roughly 20-30 minutes."
        )

    #  FIX 5: async + Annotated description
    @llm.function_tool(description="Check the delivery status of an active order.")
    async def get_order_status(
        self,
        order_id: Annotated[
            str,
            "The order ID to check status for, e.g. 'Z-123456' or '#Z-123456'",
        ],
    ) -> str:
        logger.info(f"Fetching status for Order ID: {order_id}")
        clean_id = order_id.replace("#", "")

        statuses = [
            f"Order #{clean_id} is being prepared by the restaurant kitchen. The delivery agent will pick it up soon.",
            f"The delivery partner has picked up your order #{clean_id} and is on their way. They should arrive in 8 minutes.",
            f"Order #{clean_id} is out for delivery and is currently 2 kilometers away from your address.",
            f"Order #{clean_id} has been delivered successfully to your doorstep.",
        ]
        return random.choice(statuses)

    # transfer_call was already async — no changes needed
    @llm.function_tool(description="Transfer the call to a human support agent or another phone number.")
    async def transfer_call(self, destination: Optional[str] = None) -> str:
        if destination is None:
            destination = config.DEFAULT_TRANSFER_NUMBER
            if not destination:
                return "Error: No default transfer number configured."

        if "@" not in destination:
            if config.SIP_DOMAIN:
                clean_dest = destination.replace("tel:", "").replace("sip:", "")
                destination = f"sip:{clean_dest}@{config.SIP_DOMAIN}"
            else:
                if not destination.startswith("tel:") and not destination.startswith("sip:"):
                    destination = f"tel:{destination}"
        elif not destination.startswith("sip:"):
            destination = f"sip:{destination}"

        logger.info(f"Transferring call to {destination}")
        participant_identity = None
        if self.phone_number:
            participant_identity = f"sip_{self.phone_number}"
        else:
            for p in self.ctx.room.remote_participants.values():
                participant_identity = p.identity
                break

        if not participant_identity:
            logger.error("Could not determine participant identity for transfer")
            return "Failed to transfer: could not identify the caller."

        try:
            logger.info(f"Transferring participant {participant_identity} to {destination}")
            await self.ctx.api.sip.transfer_sip_participant(
                api.TransferSIPParticipantRequest(
                    room_name=self.ctx.room.name,
                    participant_identity=participant_identity,
                    transfer_to=destination,
                    play_dialtone=False,
                )
            )
            return "Transfer initiated successfully."
        except Exception as e:
            logger.error(f"Transfer failed: {e}")
            return f"Error executing transfer: {e}"


class OutboundAssistant(Agent):
    """
    An AI agent tailored for outbound calls.
    Attempts to be helpful and concise.
    """
    def __init__(self, tools: list) -> None:
        super().__init__(
            instructions=config.SYSTEM_PROMPT,
            tools=tools,
        )


async def entrypoint(ctx: agents.JobContext):
    """
    Main entrypoint for the agent.

    For outbound calls:
    1. Checks for 'phone_number' in the job metadata.
    2. Connects to the room.
    3. Initiates the SIP call to the phone number.
    4. Waits for answer before speaking.
    """
    logger.info(f"--- STARTING AGENT JOB (Room: {ctx.room.name}, Job ID: {ctx.job.id}) ---")

    try:
        phone_number = None
        config_dict = {}

        # Check Job Metadata
        if ctx.job.metadata:
            try:
                data = json.loads(ctx.job.metadata)
                phone_number = data.get("phone_number")
                config_dict = data
                logger.info(f"Loaded Job Metadata: {config_dict}")
            except Exception as e:
                logger.warning(f"Failed to parse Job Metadata: {e}")

        # Check Room Metadata - Overrides Job Metadata
        if ctx.room.metadata:
            try:
                data = json.loads(ctx.room.metadata)
                if data.get("phone_number"):
                    phone_number = data.get("phone_number")
                config_dict.update(data)
                logger.info(f"Loaded/Merged Room Metadata: {config_dict}")
            except Exception as e:
                logger.warning(f"Failed to parse Room Metadata: {e}")

        logger.info(f"Active Phone/Identity setting: {phone_number}")

        # Initialize function context
        fnc_ctx = FoodOrderingFunctions(ctx, phone_number)

        # Build services
        llm_provider = config_dict.get("model_provider")
        voice_id = config_dict.get("voice_id")

        logger.info(f"Initializing LLM (Provider: {llm_provider})...")
        built_llm = _build_llm(llm_provider)

        logger.info(f"Initializing TTS (Provider: {llm_provider}, Voice ID: {voice_id})...")
        built_tts = _build_tts(llm_provider, voice_id)

        # Initialize the Agent Session with plugins
        logger.info("Initializing AgentSession...")
        session = AgentSession(
            vad=silero.VAD.load(),
            stt=deepgram.STT(model=config.STT_MODEL, language=config.STT_LANGUAGE),
            llm=built_llm,
            tts=built_tts,
        )

        # Start the session
        logger.info("Starting AgentSession on LiveKit room...")
        await session.start(
            room=ctx.room,
            agent=OutboundAssistant(tools=list(fnc_ctx.function_tools.values())),
            room_input_options=RoomInputOptions(
                noise_cancellation=noise_cancellation.BVCTelephony(),
                close_on_disconnect=True,
            ),
        )
        logger.info("AgentSession started successfully!")

        should_dial = False
        if phone_number and phone_number != "web-client":
            user_already_here = False
            for p in ctx.room.remote_participants.values():
                if f"sip_{phone_number}" in p.identity or "sip_" in p.identity:
                    user_already_here = True
                    break

            if not user_already_here:
                should_dial = True
                logger.info(f"User not in room. Dial-out needed for {phone_number}.")
            else:
                logger.info("User already in room. No dial-out needed.")

        if should_dial:
            logger.info(f"Dialing SIP carrier for {phone_number} using trunk {config.SIP_TRUNK_ID}...")
            try:
                await ctx.api.sip.create_sip_participant(
                    api.CreateSIPParticipantRequest(
                        room_name=ctx.room.name,
                        sip_trunk_id=config.SIP_TRUNK_ID,
                        sip_call_to=phone_number,
                        participant_identity=f"sip_{phone_number}",
                        wait_until_answered=True,
                    )
                )
                logger.info("SIP Call Answered!")
                logger.info("Generating initial greeting...")
                await session.generate_reply(instructions=config.INITIAL_GREETING)
            except Exception as e:
                logger.error(f"Failed to place SIP outbound call: {e}", exc_info=True)
                ctx.shutdown()
        else:
            logger.info(f"Direct connection / WebRTC session detected (phone_number: {phone_number}).")
            logger.info("Generating greeting...")
            await session.generate_reply(instructions=config.fallback_greeting)
            logger.info("Greeting generation requested.")

    except Exception as err:
        logger.error(f"CRITICAL ERROR in entrypoint execution: {err}", exc_info=True)
        ctx.shutdown()


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="outbound-caller",
        )
    )