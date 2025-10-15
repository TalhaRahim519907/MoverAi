import { GoogleGenAI, Type } from "@google/genai";
import type { InventoryData } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const inventorySchema = {
  type: Type.OBJECT,
  properties: {
    inventory: {
      type: Type.ARRAY,
      description: "A list of identified household items.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "The name of the item (e.g., 'Coffee Maker')."
          },
          count: {
            type: Type.INTEGER,
            description: "The quantity of the item found."
          },
          description: {
            type: Type.STRING,
            description: "A brief description of the item (e.g., 'Black, 12-cup capacity')."
          },
          tags: {
            type: Type.ARRAY,
            description: "Relevant tags for the item, such as room or category.",
            items: {
              type: Type.STRING,
            }
          },
          estimatedSize: {
            type: Type.STRING,
            description: "An approximation of the item's volume. MUST include units, like 'cubic feet' or 'cu ft' (e.g., 'approx. 1.5 cubic feet')."
          }
        },
        required: ["name", "count", "description", "tags", "estimatedSize"],
      }
    },
    transcript: {
      type: Type.STRING,
      description: "A plausible, simulated transcript of a person verbally identifying items during the video walkthrough. It should sound natural and correspond to the user's description."
    },
    totalEstimatedSize: {
        type: Type.STRING,
        description: "The sum total of the estimated volume of all items. MUST include units, like 'cubic feet' or 'cu ft' (e.g., 'approx. 85.5 cubic feet')."
    }
  },
  required: ["inventory", "transcript", "totalEstimatedSize"],
};

/**
 * Ensures a size string contains units. If not, it appends 'cubic feet'.
 * @param {string | number} size - The size string or number from the AI.
 * @returns {string} The size string with units.
 */
const ensureUnits = (size: string | number): string => {
    const sizeStr = String(size).trim();
    // Regex to check for common units like 'cubic feet', 'cu ft', 'ft³', etc.
    if (/(cubic|cu\s?ft|ft\s?³|feet)/i.test(sizeStr)) {
        return sizeStr;
    }
    // If it's just a number or contains a number, append units.
    if (/^\d+(\.\d+)?$/.test(sizeStr) || /\d/.test(sizeStr)) {
        return `${sizeStr} cubic feet`;
    }
    return sizeStr; // Return original if no number is found (e.g., "variable")
};


export const generateInventoryFromDescription = async (description: string): Promise<InventoryData> => {
    const prompt = `
        You are an expert moving consultant AI for 'MoverAi', with deep knowledge of standard furniture, appliance, and box dimensions. Your primary goal is to provide an accurate household inventory and volume estimate for a user's move.

        **Reference Information for Volume Estimation (in cubic feet):**
        - Large L-shaped sectional sofa: 100-150 cu ft
        - 3-seater sofa: 40-60 cu ft
        - Armchair: 15-25 cu ft
        - Coffee table: 10-15 cu ft
        - Large flat-screen TV (e.g., 70-inch): 15-20 cu ft (including protective packaging)
        - Bookshelf (tall): 20-30 cu ft
        - Queen-sized bed (mattress, box spring, frame): 60-80 cu ft
        - Dresser (long): 30-40 cu ft
        - Refrigerator (standard): 40-60 cu ft
        - Dining table with 4 chairs: 50-70 cu ft
        - Standard moving box (medium): 3 cu ft

        Based on the following user-provided description, generate a detailed inventory list, a plausible simulated audio transcript, and accurate size estimations.

        User's Description:
        "${description}"

        **Your Tasks:**
        1.  Identify all distinct household items mentioned or implied.
        2.  Deduplicate and count similar items (e.g., 'chairs' and 'a dining chair' should be consolidated).
        3.  Provide a brief, descriptive detail for each item.
        4.  **Crucially, provide an accurate estimation of each item's volume in cubic feet, using the reference information above as a guide.** Your estimation must be a string and MUST include the units (e.g., "approx. 25 cubic feet"). Extrapolate for items not on the list based on their description (e.g., a "small armchair" would be closer to 15 cu ft).
        5.  Assign relevant tags, such as room ('Kitchen', 'Living Room') or category ('Appliance', 'Furniture').
        6.  Create a simulated, natural-sounding audio transcript of someone identifying the items during a video walkthrough. This should match the user's description and the generated inventory.
        7.  Calculate the total estimated volume by summing the sizes of all individual items (accounting for quantity). This total must be a string and MUST include the units (e.g., "approx. 250.5 cubic feet").
        8.  Return the final output strictly in the specified JSON format.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: inventorySchema,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText) as InventoryData;
        
        if (!parsedData.inventory || !parsedData.transcript || !parsedData.totalEstimatedSize) {
            throw new Error("AI response is missing required fields.");
        }

        // Post-processing to ensure units are always present as a fallback
        parsedData.totalEstimatedSize = ensureUnits(parsedData.totalEstimatedSize);
        parsedData.inventory = parsedData.inventory.map(item => ({
            ...item,
            estimatedSize: ensureUnits(item.estimatedSize),
        }));

        return parsedData;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate inventory from AI. Please check the console for more details.");
    }
};

const simulatedDescriptions = [
    `The video shows a moderately sized living room. There is a large, grey L-shaped sectional sofa against one wall, adorned with several decorative pillows. In front of the sofa sits a rectangular wooden coffee table with a few magazines on it. Across from the sofa is a large flat-screen television mounted on the wall above a low-profile media console. To the right of the TV, there's a tall bookshelf filled with books and some small decorative items. The room has hardwood floors, partially covered by a patterned area rug. There are two windows with white blinds letting in natural light. In one corner, there's a potted plant.`,
    `This video walkthrough covers a kitchen. The kitchen features dark wood cabinets and stainless steel appliances, including a large refrigerator, a gas stove, and a dishwasher. There's a central island with a granite countertop and two bar stools. On the counter, you can see a microwave, a coffee maker, and a knife block. A double-basin sink is located under a window. The floor is tiled.`,
    `The footage is of a master bedroom. In the center of the room is a queen-sized bed with a dark wood headboard, flanked by two matching nightstands, each with a lamp. Opposite the bed is a long dresser with a mirror. There's a walk-in closet with the door slightly ajar. A small armchair sits in one corner. The room is carpeted and has one large window with curtains.`,
    `A home office is depicted in the video. The main piece of furniture is a large L-shaped desk holding two computer monitors, a laptop, and a keyboard. An ergonomic office chair is pulled up to the desk. Along one wall is a set of white bookshelves filled with binders and books. A small filing cabinet is tucked under the desk. A printer sits on a small side table.`,
];

/**
 * Placeholder service to simulate extracting a text description from a video file.
 * This version randomly selects a description and uses a variable delay to feel more realistic.
 * @param {File} videoFile - The video file to be "processed".
 * @returns {Promise<string>} A promise that resolves to a descriptive string.
 */
export const generateDescriptionFromVideo = (videoFile: File): Promise<string> => {
    console.log(`Simulating processing for video: ${videoFile.name}`);
    
    return new Promise(resolve => {
        // Simulate a more realistic, variable processing time (e.g., between 3 and 6 seconds)
        const processingTime = 3000 + Math.random() * 3000;
        
        setTimeout(() => {
            // Select a random description from the array
            const randomIndex = Math.floor(Math.random() * simulatedDescriptions.length);
            const simulatedDescription = simulatedDescriptions[randomIndex];
            
            resolve(simulatedDescription);
        }, processingTime);
    });
};