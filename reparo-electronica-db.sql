--
-- PostgreSQL database dump
--

\restrict UlR9Gkw4lTTbi5DEbJon97FhN4EqgEtBPL7Ie7Eh2gQ1OjUk4yTk8dUbUalbOmP

-- Dumped from database version 17.6 (Ubuntu 17.6-1.pgdg24.04+1)
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clientes; Type: TABLE; Schema: public; Owner: alex
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    localizacion character varying(150),
    contacto character varying(150)
);


ALTER TABLE public.clientes OWNER TO alex;

--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: alex
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clientes_id_seq OWNER TO alex;

--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alex
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: pedidos; Type: TABLE; Schema: public; Owner: alex
--

CREATE TABLE public.pedidos (
    id integer NOT NULL,
    fecha_entrada date DEFAULT now() NOT NULL,
    equipo character varying(100) NOT NULL,
    problema text,
    estado character varying(50) DEFAULT 'pendiente'::character varying NOT NULL,
    fecha_reparacion date,
    fecha_pagado date,
    precio numeric(10,2),
    comentarios text,
    cliente_id integer,
    numero_serie character varying(50),
    part_number character varying(50)
);


ALTER TABLE public.pedidos OWNER TO alex;

--
-- Name: pedidos_id_seq; Type: SEQUENCE; Schema: public; Owner: alex
--

CREATE SEQUENCE public.pedidos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pedidos_id_seq OWNER TO alex;

--
-- Name: pedidos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alex
--

ALTER SEQUENCE public.pedidos_id_seq OWNED BY public.pedidos.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: alex
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    hashed_password character varying(255) NOT NULL
);


ALTER TABLE public.users OWNER TO alex;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: alex
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO alex;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alex
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: pedidos id; Type: DEFAULT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public.pedidos ALTER COLUMN id SET DEFAULT nextval('public.pedidos_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: alex
--

COPY public.clientes (id, nombre, localizacion, contacto) FROM stdin;
1	Juan Sol Balear	Palma	
3	Fran	Palma	
2	Alexa		a@gmail.com
\.


--
-- Data for Name: pedidos; Type: TABLE DATA; Schema: public; Owner: alex
--

COPY public.pedidos (id, fecha_entrada, equipo, problema, estado, fecha_reparacion, fecha_pagado, precio, comentarios, cliente_id, numero_serie, part_number) FROM stdin;
1	2023-07-18	TCNet Logic Controller	Fuente	Pendiente	2022-12-29	2023-01-11	30.00	Sin comentarios	1	9374	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: alex
--

COPY public.users (id, username, hashed_password) FROM stdin;
1	admin	$2b$12$EntJWoX4cqN1GaPvxCQv1u.s2jcEjWHJPDvea8E/OtCazuXge7DHO
\.


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alex
--

SELECT pg_catalog.setval('public.clientes_id_seq', 4, true);


--
-- Name: pedidos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alex
--

SELECT pg_catalog.setval('public.pedidos_id_seq', 6, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alex
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: pedidos pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: pedidos fk_cliente; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT fk_cliente FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- PostgreSQL database dump complete
--

\unrestrict UlR9Gkw4lTTbi5DEbJon97FhN4EqgEtBPL7Ie7Eh2gQ1OjUk4yTk8dUbUalbOmP

