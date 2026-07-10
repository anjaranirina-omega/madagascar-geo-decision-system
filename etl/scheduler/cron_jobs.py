import time
from pipelines.pipeline_climatique import run

if __name__ == '__main__':
    while True:
        run()
        time.sleep(3600)
