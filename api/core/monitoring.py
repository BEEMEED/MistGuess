import sentry_sdk
from config import config
def init_sentry():
    sentry_sdk.init(
        dsn=config.DSN,
        send_default_pii=True,
        traces_sample_rate=1.0,
)

