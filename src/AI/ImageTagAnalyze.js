// ImageTagAnalyze.js

const { ComputerVisionClient } = require("@azure/cognitiveservices-computervision");
const { CognitiveServicesCredentials } = require("@azure/ms-rest-azure-js");
const { Translate } = require('@google-cloud/translate').v2; // Google Cloud Translation API
const dotenv = require('dotenv');
dotenv.config();

// Google Cloud Translation API 인증 정보 설정
const translate = new Translate({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.TRANSLATE_KEYFILE
});

async function tagAndTranslateImage(imageData) {
    // Azure Cognitive Services 인증 정보 설정
    const subscriptionKey = process.env.VISION_KEY;
    const endpoint = process.env.VISION_ENDPOINT;
    const credentials = new CognitiveServicesCredentials(subscriptionKey);
    const computervisionClient = new ComputerVisionClient(credentials, endpoint);

    try {
        // 이미지 태그 분석
        const tagsResult = await computervisionClient.tagImageInStream(imageData);
        const imageTags = tagsResult.tags.map(tag => tag.name);

        if (imageTags.length === 0) {
            console.log("No tags detected.");
            return [];
        }

        const tagList = [
            "beach",
            "food",
            "person",
            "flower",
            "mountain",
            "sky",
            "night",
            "building",
            "animal",
            "nature",
            "skyscraper",
            "art",
            "concert",
            "tree",
            "plant",
            "river",
            "cloud",
            "car",
            "sun"
        ];

        const enTagResult = imageTags.filter(tag => tagList.includes(tag));

        // 번역
        const koTagResult = await Promise.all(enTagResult.map(async (tag) => {
            try {
                const [translation] = await translate.translate(tag, 'ko');
                return translation;
            } catch (error) {
                console.error("Translation error:", error);
                return tag; // 에러 발생 시 원문 그대로 반환
            }
        }));

        return koTagResult;
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
}

module.exports = {
    tagAndTranslateImage: tagAndTranslateImage
};
