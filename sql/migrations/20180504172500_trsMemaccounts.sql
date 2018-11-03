BEGIN;

DROP VIEW IF EXISTS trs_list;

/**
 Update trs table to have height + have constraint on addresses to be uppercase
 */
ALTER TABLE trs
  ADD COLUMN height INT;
UPDATE trs
  SET height = (SELECT height from blocks where blocks.id = trs."blockId");
ALTER TABLE trs
  ALTER COLUMN height SET NOT NULL;

COMMIT;
