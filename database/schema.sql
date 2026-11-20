-- ProjectMatrix — Task Management schema (MariaDB / MySQL)
-- Generated from the SQLAlchemy models. Safe to re-run.

CREATE DATABASE IF NOT EXISTS `projectmatrix` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `projectmatrix`;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS pm_clients (
	id VARCHAR(50) NOT NULL, 
	name VARCHAR(150) NOT NULL, 
	email VARCHAR(150), 
	status VARCHAR(30), 
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_departments (
	id VARCHAR(50) NOT NULL, 
	name VARCHAR(150) NOT NULL, 
	status VARCHAR(30), 
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_designations (
	id VARCHAR(50) NOT NULL, 
	name VARCHAR(150) NOT NULL, 
	status VARCHAR(30), 
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_labels (
	id VARCHAR(50) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	color VARCHAR(20), 
	status VARCHAR(30), 
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_resource_links (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	parent_type VARCHAR(20), 
	parent_id VARCHAR(50), 
	url VARCHAR(1000), 
	link_type VARCHAR(30), 
	label VARCHAR(200), 
	added_by VARCHAR(50), 
	created_at DATETIME, 
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_roles (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	name VARCHAR(50) NOT NULL, 
	description VARCHAR(255), 
	PRIMARY KEY (id), 
	UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_settings (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	`key` VARCHAR(100), 
	value TEXT, 
	updated_at DATETIME, 
	PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_users (
	id VARCHAR(50) NOT NULL, 
	code VARCHAR(50), 
	name VARCHAR(150) NOT NULL, 
	email VARCHAR(150) NOT NULL, 
	password VARCHAR(255) NOT NULL, 
	`role` VARCHAR(50), 
	role_id INTEGER, 
	designation VARCHAR(150), 
	department VARCHAR(150), 
	phone VARCHAR(50), 
	avatar VARCHAR(255), 
	status VARCHAR(30), 
	last_login DATETIME, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(role_id) REFERENCES pm_roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_camera_logs (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	user_id VARCHAR(50), 
	project_id VARCHAR(50), 
	task_id VARCHAR(50), 
	timesheet_id VARCHAR(50), 
	filename VARCHAR(255), 
	filepath VARCHAR(500), 
	activity_type VARCHAR(50), 
	captured_at DATETIME, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES pm_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_idle_time_logs (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	user_id VARCHAR(50), 
	log_date VARCHAR(20), 
	idle_start DATETIME, 
	idle_end DATETIME, 
	duration_seconds INTEGER, 
	reason VARCHAR(50), 
	notified BOOL, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES pm_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_notifications (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	user_id VARCHAR(50), 
	type VARCHAR(50), 
	title VARCHAR(200), 
	message TEXT, 
	link VARCHAR(255), 
	task_id VARCHAR(50), 
	is_read BOOL, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES pm_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_password_reset_tokens (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	user_id VARCHAR(50), 
	token_hash VARCHAR(255), 
	expires_at DATETIME, 
	used BOOL, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES pm_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_profile_change_requests (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	user_id VARCHAR(50), 
	field VARCHAR(30), 
	old_value VARCHAR(255), 
	new_value VARCHAR(255), 
	status VARCHAR(20), 
	reason TEXT, 
	reviewed_by VARCHAR(50), 
	requested_at DATETIME, 
	reviewed_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES pm_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_projects (
	id VARCHAR(50) NOT NULL, 
	code VARCHAR(50), 
	name VARCHAR(200) NOT NULL, 
	description TEXT, 
	owner_id VARCHAR(50), 
	priority VARCHAR(20), 
	status VARCHAR(30), 
	progress INTEGER, 
	review_required BOOL, 
	start_date VARCHAR(20), 
	end_date VARCHAR(20), 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(owner_id) REFERENCES pm_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_modules (
	id VARCHAR(50) NOT NULL, 
	project_id VARCHAR(50), 
	name VARCHAR(150) NOT NULL, 
	description TEXT, 
	sort_order INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES pm_projects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_project_attachments (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	project_id VARCHAR(50), 
	filename VARCHAR(255), 
	filepath VARCHAR(500), 
	uploaded_by VARCHAR(50), 
	uploaded_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES pm_projects (id) ON DELETE CASCADE, 
	FOREIGN KEY(uploaded_by) REFERENCES pm_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_project_members (
	id VARCHAR(50) NOT NULL, 
	project_id VARCHAR(50), 
	employee_id VARCHAR(50), 
	`role` VARCHAR(50), 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES pm_projects (id) ON DELETE CASCADE, 
	FOREIGN KEY(employee_id) REFERENCES pm_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_sections (
	id VARCHAR(50) NOT NULL, 
	project_id VARCHAR(50), 
	name VARCHAR(150) NOT NULL, 
	sort_order INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES pm_projects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_tasks (
	id VARCHAR(50) NOT NULL, 
	code VARCHAR(50), 
	name VARCHAR(255) NOT NULL, 
	description TEXT, 
	project_id VARCHAR(50), 
	section_id VARCHAR(50), 
	module_id VARCHAR(50), 
	priority VARCHAR(20), 
	status VARCHAR(30), 
	progress INTEGER, 
	assigned_to VARCHAR(50), 
	reviewer_id VARCHAR(50), 
	start_date VARCHAR(20), 
	end_date VARCHAR(20), 
	estimated_hours FLOAT, 
	label VARCHAR(100), 
	category VARCHAR(40), 
	custom_data TEXT, 
	parent_task_id VARCHAR(50), 
	created_by VARCHAR(50), 
	completed_at DATETIME, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES pm_projects (id) ON DELETE SET NULL, 
	FOREIGN KEY(section_id) REFERENCES pm_sections (id) ON DELETE SET NULL, 
	FOREIGN KEY(module_id) REFERENCES pm_modules (id) ON DELETE SET NULL, 
	FOREIGN KEY(assigned_to) REFERENCES pm_users (id) ON DELETE SET NULL, 
	FOREIGN KEY(reviewer_id) REFERENCES pm_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_comments (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	task_id VARCHAR(50), 
	user_id VARCHAR(50), 
	user_name VARCHAR(150), 
	text TEXT, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(task_id) REFERENCES pm_tasks (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES pm_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_leads (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	task_id VARCHAR(50), 
	name VARCHAR(150), 
	email VARCHAR(150), 
	phone VARCHAR(50), 
	company VARCHAR(150), 
	status VARCHAR(30), 
	source VARCHAR(120), 
	notes TEXT, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(task_id) REFERENCES pm_tasks (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_subtasks (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	task_id VARCHAR(50), 
	title VARCHAR(255) NOT NULL, 
	is_done BOOL, 
	sort_order INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(task_id) REFERENCES pm_tasks (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_task_attachments (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	task_id VARCHAR(50), 
	filename VARCHAR(255), 
	filepath VARCHAR(500), 
	original_name VARCHAR(255), 
	uploaded_by VARCHAR(50), 
	uploaded_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(task_id) REFERENCES pm_tasks (id) ON DELETE CASCADE, 
	FOREIGN KEY(uploaded_by) REFERENCES pm_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_task_updates (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	task_id VARCHAR(50), 
	user_id VARCHAR(50), 
	user_name VARCHAR(150), 
	update_type VARCHAR(50), 
	old_value VARCHAR(150), 
	new_value VARCHAR(150), 
	remark TEXT, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(task_id) REFERENCES pm_tasks (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES pm_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_timesheets (
	id VARCHAR(50) NOT NULL, 
	code VARCHAR(50), 
	user_id VARCHAR(50), 
	project_id VARCHAR(50), 
	task_id VARCHAR(50), 
	work_date VARCHAR(20), 
	from_time VARCHAR(20), 
	to_time VARCHAR(20), 
	total_hours FLOAT, 
	remarks TEXT, 
	status VARCHAR(30), 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES pm_users (id) ON DELETE CASCADE, 
	FOREIGN KEY(project_id) REFERENCES pm_projects (id) ON DELETE SET NULL, 
	FOREIGN KEY(task_id) REFERENCES pm_tasks (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pm_timesheet_attachments (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	timesheet_id VARCHAR(50), 
	filename VARCHAR(255), 
	filepath VARCHAR(500), 
	original_name VARCHAR(255), 
	source VARCHAR(20), 
	uploaded_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(timesheet_id) REFERENCES pm_timesheets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Base seed data ----------
INSERT INTO `pm_roles` (`name`, `description`) VALUES
 ('Admin', 'Full application access'),
 ('Master', 'Operational oversight and monitoring'),
 ('Worker', 'Assigned work, timesheets, personal performance');

INSERT INTO `pm_users` (`id`, `code`, `name`, `email`, `password`, `role`, `role_id`, `designation`, `department`, `status`) VALUES
 ('U-ADMIN', 'EMP-001', 'System Administrator', 'admin@taskmanagement.com', '$2b$12$NF2CowAyI5uzZYlvtJNaP.C2QcWm4gO6K6446Unwq7VxqtxDTGHa2', 'Admin', 1, 'System Administrator', 'Management', 'Active'),
 ('U-MASTER', 'EMP-002', 'Priya Menon', 'master@taskmanagement.com', '$2b$12$B5EofQbUAOyZKQuVnUTG9ONlVxZadSO2NGaRNWvy.6YSXiH76JeWG', 'Master', 2, 'Operations Manager', 'Management', 'Active'),
 ('U-W1', 'EMP-003', 'Ravi Kumar', 'ravi@taskmanagement.com', '$2b$12$C3JlicWDH5HciiS1pChlQuwMAXI4LEd87pr41CR0IWrcf1D8GJoCG', 'Worker', 3, 'Senior Engineer', 'Engineering', 'Active'),
 ('U-W2', 'EMP-004', 'Anita Sharma', 'anita@taskmanagement.com', '$2b$12$C3JlicWDH5HciiS1pChlQuwMAXI4LEd87pr41CR0IWrcf1D8GJoCG', 'Worker', 3, 'Full Stack Engineer', 'Engineering', 'Active'),
 ('U-W3', 'EMP-005', 'Sachin Verma', 'sachin@taskmanagement.com', '$2b$12$C3JlicWDH5HciiS1pChlQuwMAXI4LEd87pr41CR0IWrcf1D8GJoCG', 'Worker', 3, 'UI/UX Designer', 'Design', 'Active');

INSERT INTO `pm_clients` (`id`, `name`, `email`, `status`) VALUES
 ('CLI-01', 'Acme Corp', 'contact@acme.com', 'Active'),
 ('CLI-02', 'Global Industries', 'info@global.com', 'Active');

INSERT INTO `pm_departments` (`id`, `name`, `status`) VALUES
 ('DEP-01', 'Engineering', 'Active'),
 ('DEP-02', 'Design', 'Active'),
 ('DEP-03', 'Management', 'Active');

INSERT INTO `pm_designations` (`id`, `name`, `status`) VALUES
 ('DSG-01', 'System Administrator', 'Active'),
 ('DSG-02', 'Operations Manager', 'Active'),
 ('DSG-03', 'Senior Engineer', 'Active'),
 ('DSG-04', 'Full Stack Engineer', 'Active'),
 ('DSG-05', 'UI/UX Designer', 'Active');

INSERT INTO `pm_labels` (`id`, `name`, `color`) VALUES
 ('LBL-01', 'Bug', '#ef4444'),
 ('LBL-02', 'Feature', '#3b82f6'),
 ('LBL-03', 'High Priority', '#f59e0b'),
 ('LBL-04', 'Design', '#8b5cf6'),
 ('LBL-05', 'Documentation', '#10b981');

SET FOREIGN_KEY_CHECKS = 1;
