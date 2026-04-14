-- PTU Event Management System Database Schema
-- Updated: uses roles TEXT[] (array) instead of role VARCHAR

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  roles TEXT[] DEFAULT ARRAY['student'],       -- replaces single 'role' column
  department VARCHAR(255),
  student_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date TIMESTAMP NOT NULL,
  venue VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  capacity INTEGER DEFAULT 100,
  organizer VARCHAR(255),
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  price INTEGER DEFAULT 0,  -- Price in INR (0 for free events)
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Registrations table
CREATE TABLE registrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'waitlisted', 'checked_in')),
  payment_id VARCHAR(255),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  ticket_id VARCHAR(255) UNIQUE,
  UNIQUE(user_id, event_id)
);

-- Seed admin user (password: admin123)
INSERT INTO users (name, email, password, roles) VALUES
('Admin User', 'nafeezm155@gmail.com', '$2a$10$NVPSmzSuXSpCgfy4hFnGtemGiNI2qkSdqm9xPOehsMJVo/hGnBU8q', ARRAY['admin']);

-- Seed multi-role demo user (password: admin123)
INSERT INTO users (name, email, password, roles) VALUES
('Super User', 'super@ptu.edu.in', '$2a$10$pcubgmyyKTYSJFBDyS2KweeblS1pOdv4SWfQvDFs6.etDdzS.f7TS', ARRAY['admin', 'student']);

-- Seed sample students (password: student123)
INSERT INTO users (name, email, password, roles, department, student_id) VALUES
('Arun Kumar',    'arun@ptu.edu.in',   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', ARRAY['student'], 'CSE',                    'CS2021001'),
('Priya Sharma',  'priya@ptu.edu.in',  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', ARRAY['student'], 'ECE',                    'EC2021002'),
('Rahul Verma',   'rahul@ptu.edu.in',  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', ARRAY['student'], 'Mechanical Engineering',  'ME2021003'),
('Divya Lakshmi', 'divya@ptu.edu.in',  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', ARRAY['student'], 'IT',                     'IT2021004'),
('Karthik Rajan', 'karthik@ptu.edu.in','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', ARRAY['student'], 'EEE',                    'EE2021005');

-- Seed sample events
INSERT INTO events (title, description, date, venue, category, capacity, organizer, status, created_by) VALUES
('Guest Lecture: Industry Insights on Cloud Computing',   'Join us for an insightful session by industry experts on the latest trends in cloud computing and its applications in modern software development.',  '2026-04-06 10:00:00', 'Lecture Hall 1, Academic Block',       'Lecture',     150, 'Department of CSE',          'upcoming', 1),
('Workshop on AI & Machine Learning',                     'A hands-on workshop covering fundamentals of AI and ML with practical exercises using Python and TensorFlow.',                                          '2026-04-08 09:00:00', 'Seminar Hall - Block B',               'Workshop',     80, 'AI Research Club',           'upcoming', 1),
('Cultural Fest - Techno Utsav 2026',                     'Annual cultural festival featuring music, dance, drama, and technical exhibitions. Open to all students.',                                              '2026-04-15 09:00:00', 'University Auditorium',                'Cultural',    500, 'Student Council',            'upcoming', 1),
('Hackathon 2026',                                        '24-hour coding competition where teams build innovative solutions to real-world problems.',                                                              '2026-04-20 08:00:00', 'Innovation Lab, Block C',              'Competition', 200, 'Computer Science Association','upcoming', 1),
('Sports Day - Annual Athletics Meet',                    'Annual sports meet featuring track and field events, team sports, and individual competitions.',                                                        '2026-04-25 07:00:00', 'University Sports Ground',             'Sports',      300, 'Sports Committee',           'upcoming', 1),
('Seminar on Cybersecurity',                              'Expert panel discussion on cybersecurity threats and defense strategies in 2026.',                                                                       '2026-04-30 11:00:00', 'Conference Hall - Admin Block',        'Seminar',     100, 'Information Security Club',  'upcoming', 1);

-- Sample registrations
INSERT INTO registrations (user_id, event_id, status) VALUES
(3, 1, 'confirmed'),
(3, 2, 'confirmed'),
(4, 1, 'confirmed'),
(4, 3, 'confirmed'),
(5, 2, 'confirmed');

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_events_date              ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_status            ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_by        ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id    ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id   ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status     ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_pay_status ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_ticket_id  ON registrations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_users_email              ON users(email);
-- GIN index for efficient array containment queries (roles @> ARRAY['student'])
CREATE INDEX IF NOT EXISTS idx_users_roles              ON users USING GIN(roles);