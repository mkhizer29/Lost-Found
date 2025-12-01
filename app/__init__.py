# app/__init__.py

from flask import Flask
from flask_cors import CORS
import config
from .routes_basic import bp as basic_bp

def create_app():
    app = Flask(__name__)
    CORS(app)  # allow React (localhost:3000) to call this API

    app.config["SECRET_KEY"] = config.JWT_SECRET

    # register our routes
    app.register_blueprint(basic_bp)

    return app
