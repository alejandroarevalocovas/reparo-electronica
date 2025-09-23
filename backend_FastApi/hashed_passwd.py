from passlib.hash import bcrypt

# Tu contraseña en texto plano
password = "admin"

# Generar hash
hashed = bcrypt.hash(password)
hash_guardado = "$2b$12$EntJWoX4cqN1GaPvxCQv1u.s2jcEjWHJPDvea8E/OtCazuXge7DHO"
print(bcrypt.verify("admin", hash_guardado))
print("Contraseña en hash:", hashed)
