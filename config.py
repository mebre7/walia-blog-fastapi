from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    secret_key: SecretStr
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1
    max_upload_size_bytes: int = 5 * 1024 * 1024
    database_url: str


settings = Settings() # type: ignore[call-arg]This will read the .env file and load the settings into the Settings object. You can then access the settings using settings.secret_key, settings.algorithm, and settings.access_token_expire_minutes.
