create table if not exists users (
  id char(36) primary key,
  email varchar(255) not null unique,
  password_hash varchar(255) null,
  oauth_provider varchar(32) null,
  oauth_sub varchar(128) null,
  role enum('free','paid','admin') not null default 'free',
  status enum('active','banned') not null default 'active',
  locale varchar(16) not null default 'en',
  created_at datetime not null,
  updated_at datetime not null,
  unique key uniq_oauth (oauth_provider, oauth_sub)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists profiles (
  user_id char(36) primary key,
  email varchar(255) null,
  role enum('free','paid','admin') not null default 'free',
  status enum('active','banned') not null default 'active',
  locale varchar(16) not null default 'en',
  name varchar(255) not null default '',
  gender varchar(32) not null default '',
  birth_date date null,
  birth_time varchar(16) null,
  relationship_status varchar(32) null,
  birth_place varchar(255) not null default '',
  current_residence varchar(255) not null default '',
  daily_remaining int not null default 3,
  daily_date date not null,
  monthly_remaining int not null default 0,
  monthly_month date not null,
  vip_expiry date null,
  created_at datetime not null,
  updated_at datetime not null,
  constraint fk_profiles_user foreign key (user_id) references users(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists divination_records (
  id char(36) primary key,
  user_id char(36) not null,
  created_at datetime not null,
  dimension varchar(16) not null,
  question text not null,
  primary_name varchar(64) not null,
  primary_binary varchar(8) not null,
  relating_name varchar(64) not null,
  relating_binary varchar(8) not null,
  changing_lines json not null,
  coins json not null,
  primary_lines_bottom_to_top json not null,
  relating_lines_bottom_to_top json not null,
  basis_json json not null,
  ai_analysis mediumtext not null,
  index idx_records_user_created (user_id, created_at),
  constraint fk_records_user foreign key (user_id) references users(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists daily_fortunes (
  date date not null,
  locale varchar(16) not null,
  dimension varchar(16) not null,
  score int not null,
  text text not null,
  created_at datetime not null,
  updated_at datetime not null,
  primary key (date, locale, dimension),
  index idx_daily_locale_date (locale, date)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists agents (
  id char(36) primary key,
  status enum('active','disabled') not null default 'active',
  is_default tinyint(1) not null default 0,
  name_zh varchar(128) not null,
  name_en varchar(128) not null,
  description_zh text not null,
  description_en text not null,
  system_prompt_zh mediumtext not null,
  system_prompt_en mediumtext not null,
  created_at datetime not null,
  updated_at datetime not null,
  index idx_agents_default (is_default, updated_at),
  index idx_agents_status (status, updated_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists user_agent_prefs (
  user_id char(36) primary key,
  default_agent_id char(36) not null,
  updated_at datetime not null,
  constraint fk_agent_prefs_user foreign key (user_id) references users(id) on delete cascade,
  constraint fk_agent_prefs_agent foreign key (default_agent_id) references agents(id) on delete restrict
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists chat_conversations (
  id char(36) primary key,
  user_id char(36) not null,
  agent_id char(36) not null,
  title varchar(255) not null default '',
  created_at datetime not null,
  updated_at datetime not null,
  index idx_chat_user_updated (user_id, updated_at),
  constraint fk_chat_conv_user foreign key (user_id) references users(id) on delete cascade,
  constraint fk_chat_conv_agent foreign key (agent_id) references agents(id) on delete restrict
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists chat_messages (
  id char(36) primary key,
  conversation_id char(36) not null,
  role enum('user','assistant') not null,
  content mediumtext not null,
  created_at datetime not null,
  index idx_chat_msg_conv_created (conversation_id, created_at),
  constraint fk_chat_msg_conv foreign key (conversation_id) references chat_conversations(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists user_memories (
  id char(36) primary key,
  user_id char(36) not null,
  kind varchar(32) not null,
  content text not null,
  importance tinyint not null default 1,
  created_at datetime not null,
  updated_at datetime not null,
  index idx_um_user_updated (user_id, updated_at),
  index idx_um_user_kind (user_id, kind),
  constraint fk_um_user foreign key (user_id) references users(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists ai_provider_configs (
  id char(36) primary key,
  provider varchar(64) not null,
  name varchar(255) not null default '',
  base_url varchar(255) not null,
  model varchar(128) not null,
  api_key varchar(255) not null,
  api_key_last4 varchar(4) null,
  is_default tinyint(1) not null default 0,
  updated_at datetime not null,
  index idx_ai_default (is_default, updated_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists redeem_codes (
  id char(36) primary key,
  code varchar(64) not null unique,
  type enum('monthly','quarterly','yearly','permanent') not null,
  status enum('unused','used','revoked') not null default 'unused',
  used_by char(36) null,
  used_at datetime null,
  created_at datetime not null,
  index idx_codes_status_created (status, created_at),
  constraint fk_codes_used_by foreign key (used_by) references users(id) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists nfc_bindings (
  id char(36) primary key,
  user_id char(36) not null,
  tag_uid varchar(64) not null,
  label varchar(255) not null default '',
  created_at datetime not null,
  unique key uniq_user_tag (user_id, tag_uid),
  index idx_nfc_user_created (user_id, created_at),
  constraint fk_nfc_user foreign key (user_id) references users(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
