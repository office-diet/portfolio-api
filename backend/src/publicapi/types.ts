// SQL実行結果 users 
export interface UserRow {
    id          : string;
    name        : string;
    os          : string;
    device      : string;
    browser     : string;
    lang        : string;
    timezone    : string;
    enter_at    : Date;
    exit_at     : Date;

}

// API返却データ users
export interface UserResonse {
    id          : string;
    userName    : string;
    os          : string;
    device      : string;
    browser     : string;
    lang        : string;
    timezone    : string;
    enterAt     : string;
    exitAt      : string;
}

// SQL返却データ messages
export interface MessageRow {
    id          : string;
    visitor_id     : string;
    name   : string;
    message     : string;
    dflag       : string;
    created_at  : Date;
}

// API返却データ messages
export interface MessageResponse {
    id          : string;
    userId      : string;
    userName    : string;
    message     : string;
    dflag       : string;
    createdAt   : string;
}