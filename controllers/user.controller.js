import User from "../mongodb/models/user.js";

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate("allProperties");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).populate("allProperties");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error fetching user" });
  }
};

const createUser = async (req, res) => {
  const { name, email, avatar } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(200).json(userExists);
  }

  const newUser = new User({ name, email, avatar });
  try {
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(500).json({ message: "Error creating user" });
  }
};

export { getAllUsers, getUserById, createUser };
