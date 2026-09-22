#!/usr/bin/env python3
"""Автопроверка уровней Nooka на экране телефона.

Запуск из корня репозитория сайта:

    python3 tools/check-levels.py              все уровни и мастерские
    python3 tools/check-levels.py draw prompt  только страницы, где в адресе есть эти слова
    python3 tools/check-levels.py --show       с окном браузера — смотреть, как бот играет

Что делает. Поднимает сайт на localhost и рядом заглушку сервера на :8787:
доступ открыт, вход — гость, прогресс никуда не уходит. Открывает
tools/levels-check.html в Chrome без окна и с чистым профилем, ждёт отчёт
и печатает таблицу. Код выхода 1, если нашлась поломка (✗).

Нужны только Python 3 и Google Chrome. Путь к Chrome можно задать в CHROME.
"""
import functools
import http.server
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_PORT = int(os.environ.get('CHECK_PORT', '8931'))
API_PORT = 8787          # nooka-account.js на localhost ходит именно сюда
TIMEOUT = 15 * 60
CHROME = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')

report = {}
got_report = threading.Event()


class Site(http.server.SimpleHTTPRequestHandler):
    """Статика сайта без кеша + приём отчёта от страницы проверки."""

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

    def do_POST(self):
        if self.path != '/__report':
            self.send_error(404)
            return
        size = int(self.headers.get('Content-Length') or 0)
        report.update(json.loads(self.rfile.read(size) or b'{}'))
        self.send_response(204)
        self.end_headers()
        got_report.set()

    def log_message(self, *args):
        pass


class Api(http.server.BaseHTTPRequestHandler):
    """Заглушка сервера: доступ оплачен, пользователь — гость.

    Гость — чтобы синхронизация прогресса молчала: проверке нужен открытый
    доступ, а не аккаунт. Живёт только здесь, на сайт не выкладывается."""

    def reply(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        origin = self.headers.get('Origin') or '*'
        self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.reply(204, {})

    def do_GET(self):
        if self.path.startswith('/access/state'):
            self.reply(200, {'access': {'paid': True, 'days': 365, 'source': 'check'}})
        else:
            self.reply(401, {'error': 'guest'})

    def do_POST(self):
        self.reply(401, {'error': 'guest'})

    def log_message(self, *args):
        pass


class Quiet(http.server.ThreadingHTTPServer):
    """Бот бросает загрузку страницы на полпути — это не ошибка, молчим."""

    def handle_error(self, request, client_address):
        if not isinstance(sys.exc_info()[1], (BrokenPipeError, ConnectionResetError)):
            super().handle_error(request, client_address)


def serve(handler, port):
    srv = Quiet(('127.0.0.1', port), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def plural(n, one, few, many):
    n = abs(n) % 100
    if 10 < n < 20:
        return many
    n %= 10
    return one if n == 1 else few if 2 <= n <= 4 else many


def print_report(r):
    rows = r.get('results', [])
    secs = r.get('seconds', 0)
    print(f"\nАвтопроверка уровней · экран 360×600 · {len(rows)} "
          f"{plural(len(rows), 'страница', 'страницы', 'страниц')} · {secs // 60} мин {secs % 60} с\n")
    mark = {'ok': '✓', 'warn': '⚠', 'bad': '✗'}
    game = None
    for x in rows:
        if x['game'] != game:
            game = x['game']
            print(f'  {game}')
        notes = []
        if x['status'] not in ('пройден', 'открылась'):
            notes.append(x['status'] + (f" за {x['steps']} шагов" if x['status'] == 'не дошёл' else ''))
        notes += [i['text'] for i in x['issues']]
        notes += ['ошибка JS: ' + e for e in x['errors']]
        if not notes:
            notes = [f"пройден за {x['steps']} шагов" if x['status'] == 'пройден' else x['status']]
        title = f"{x['n']:>2}  {x['title']}"
        print(f"   {mark[x['verdict']]} {title:<34} {notes[0]}")
        for extra in notes[1:]:
            print(f"     {'':<34} {extra}")
        if x['verdict'] != 'ok' and x.get('tail'):
            print(f"     {'':<34} последнее: {' → '.join(x['tail'][-5:])}")
    c = {k: sum(1 for x in rows if x['verdict'] == k) for k in mark}
    print(f"\n  Итого: ✓ {c['ok']}   ⚠ {c['warn']}   ✗ {c['bad']}")
    print('  ⚠ — стоит глянуть руками; ✗ — поломка: тупик, ошибка или кнопки не достать.\n')
    return c['bad']


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    show = '--show' in sys.argv
    if not os.path.exists(CHROME):
        sys.exit(f'Не нашёл Chrome: {CHROME}. Укажи путь в переменной CHROME.')

    try:
        site = serve(functools.partial(Site, directory=ROOT), SITE_PORT)
        api = serve(Api, API_PORT)
    except OSError as e:
        sys.exit(f'Порт занят ({e}). Закрой другой локальный сервер или задай CHECK_PORT.')

    url = f'http://localhost:{SITE_PORT}/tools/levels-check.html?auto=1&report=1'
    if args:
        url += '&only=' + ','.join(args)

    profile = tempfile.mkdtemp(prefix='nooka-check-')
    cmd = [CHROME, f'--user-data-dir={profile}', '--no-first-run', '--no-default-browser-check',
           '--window-size=1600,760', '--remote-debugging-port=0']
    if not show:
        cmd += ['--headless=new', '--disable-gpu', '--hide-scrollbars']
    print('Бот играет в уровни… (обычно 2–3 минуты)')
    started = time.time()
    chrome = subprocess.Popen(cmd + [url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        if not got_report.wait(TIMEOUT):
            sys.exit('Отчёт не пришёл за 15 минут — открой проверку с --show и посмотри, где встал бот.')
    finally:
        chrome.terminate()
        try:
            chrome.wait(5)
        except subprocess.TimeoutExpired:
            chrome.kill()
        site.shutdown()
        api.shutdown()
        shutil.rmtree(profile, ignore_errors=True)
    report.setdefault('seconds', int(time.time() - started))
    sys.exit(1 if print_report(report) else 0)


if __name__ == '__main__':
    main()
