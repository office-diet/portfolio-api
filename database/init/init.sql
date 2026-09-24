CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 日本時刻に設定
SET timezone = 'Asia/Tokyo';
ALTER DATABASE chatdb SET timezone TO 'Asia/Tokyo';

-- chat_logs
CREATE TABLE chat_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id  UUID NOT NULL,
    name        TEXT NOT NULL,
    message     TEXT NOT NULL,
    dflag       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- visitors
CREATE TABLE visitors (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    os          TEXT NOT NULL,
    device      TEXT NOT NULL,
    browser     TEXT NOT NULL,
    lang        TEXT NOT NULL,
    timezone    TEXT NOT NULL,
    enter_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    exit_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 臼ちゃんを初期データとして追加
INSERT INTO visitors (name, os, device, browser, lang, timezone)
VALUES ('臼ちゃん', 'Windows', 'PC', 'Chrome', 'ja', 'Asia/Tokyo'),
('さやか', 'iOS', 'mobile', 'Safari', 'ja', 'Asia/Tokyo')
;