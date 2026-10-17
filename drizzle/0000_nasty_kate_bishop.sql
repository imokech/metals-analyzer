CREATE TABLE "global_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(50) NOT NULL,
	"global_name" varchar(100) NOT NULL,
	"local_label" varchar(100) NOT NULL,
	"price" real,
	"source_url" varchar(255) NOT NULL,
	"last_fetched_at" timestamp,
	"manually_updated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "global_prices_slug_unique" UNIQUE("slug")
);
