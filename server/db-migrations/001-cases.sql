CREATE TYPE case_status AS ENUM ('WAITING_FOR_REVIEW', 'WAITING_FOR_APPROVAL', 'APPROVED');

CREATE TABLE cases (
  case_doc_id varchar(36) NOT NULL PRIMARY KEY,
  case_created_at timestamp WITH time zone NOT NULL DEFAULT current_timestamp,
  case_reviewed_at timestamp WITH time zone NULL,
  case_approved_at timestamp WITH time zone NULL,
  diagnosis_doc_id varchar(36) NOT NULL,
  approver_id varchar(36) NULL,
  reviewer_id varchar(36) NULL,
  status case_status NOT NULL,
  patient_user_id varchar(36) NULL,
  read_group_id varchar(36) NULL
);
