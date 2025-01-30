from fastapi import APIRouter
import base64
from io import BytesIO
from schema import ImageData
from PIL import Image
from src.calculator.utils import analyze_image

router = APIRouter()


@router.post("")
async def calculate_results(data: ImageData):
    image_data = base64.b64decode(data.image.split(",")[1])
    image_bytes = BytesIO(image_data)
    image = Image.open(image_bytes)
    responses = analyze_image(image, dict_of_vars=data.dict_of_vars)
    data = []
    for response in responses:
        data.append(response)
    return {"message": "Image processed", "data": data, "status": "success"}
