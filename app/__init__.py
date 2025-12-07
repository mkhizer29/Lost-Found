# app/__init__.py
from flask import Flask
from flask_cors import CORS
from .routes_basic import bp as basic_bp
from .routes_auth import bp as auth_bp  # <--- Import new routes
from .routes_messaging import bp as msg_bp  # <--- Import messaging routes

def create_app():
    app = Flask(__name__)
    
    # SECURITY: Secret key needed for session cookies
    app.secret_key = "CHANGE_THIS_TO_SOMETHING_SECRET" 
    
    # Allow CORS (Cross-Origin Resource Sharing) so React can talk to Flask
    # supports_credentials=True is CRITICAL for login cookies to work!
    CORS(app, supports_credentials=True) 

    # Register Blueprints
    app.register_blueprint(basic_bp)
    app.register_blueprint(auth_bp) # <--- Register new routes
    app.register_blueprint(msg_bp) # <--- Register messaging routes

    return app