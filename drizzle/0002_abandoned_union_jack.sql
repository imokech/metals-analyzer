CREATE TABLE "ime_sync_windows" (
	"id" serial PRIMARY KEY NOT NULL,
	"cat" smallint NOT NULL,
	"from_jdate" varchar(10) NOT NULL,
	"to_jdate" varchar(10) NOT NULL,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_try_at" timestamp,
	"last_error" text,
	"row_count" integer,
	"sum_quantity" double precision,
	"sum_total_price" double precision,
	"checksum" varchar(64),
	"fetched_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ime_trades" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"window_id" integer NOT NULL,
	"cat" smallint NOT NULL,
	"sub_cat" integer,
	"jdate" varchar(10) NOT NULL,
	"jmonth" varchar(7) NOT NULL,
	"goods_name" text NOT NULL,
	"producer_name" text,
	"contract_type" text,
	"tasvieh" text,
	"packet_name" text,
	"broker" text,
	"base_price" double precision,
	"price" double precision,
	"min_price" double precision,
	"max_price" double precision,
	"arze" double precision,
	"taghaza" double precision,
	"quantity" double precision NOT NULL,
	"total_price" double precision NOT NULL,
	"arzeh_pk" text,
	"talar_pk" integer,
	"raw" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ime_trades" ADD CONSTRAINT "ime_trades_window_id_ime_sync_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."ime_sync_windows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ime_sync_windows_uq" ON "ime_sync_windows" USING btree ("cat","from_jdate","to_jdate");--> statement-breakpoint
CREATE INDEX "ime_trades_date_idx" ON "ime_trades" USING btree ("cat","jdate");--> statement-breakpoint
CREATE INDEX "ime_trades_goods_idx" ON "ime_trades" USING btree ("cat","goods_name","jdate");--> statement-breakpoint
CREATE INDEX "ime_trades_window_idx" ON "ime_trades" USING btree ("window_id");