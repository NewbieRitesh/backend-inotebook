const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser')
const Notes = require('../modules/Notes');

// Route 1: fetch all notes         login required
router.get('/fetchnotes', fetchuser, async (req, res) => {
    try {
        const notes = await Notes.find({ user: req.user.id });
        res.json(notes)
    } catch (error) {
        console.error(error.msg)
        res.status(500).json({ success: false, response: error.message })
    }
})

// Route 2: add notes           login required
router.post('/addnote', fetchuser, [
    body('title', 'Enter title minimum lenth of 3 characters').isLength({ min: 3 }),
    body('description', 'Enter description with minimum 3 characters').isLength({ min: 3 }),
], async (req, res) => {
    try {
        const { title, description, tag } = req.body;
        // if there are errors then send bad request
        const errors = validationResult(req);
        if (!errors.isEmpty()) res.status(500).json({ success: false, response: errors.array()[0].msg });
        const notes = new Notes({ title, description, tag, user: req.user.id })
        const savedNote = await notes.save()
        res.json({ success: true, response: savedNote })
    } catch (error) {
        console.error(error.msg)
        res.status(500).json({ success: false, response: error.message })
    }
})

// Route 3: Update notes       login reqired
router.put('/updatenote/:id', fetchuser, [
    body('title', 'Enter title minimum lenth of 3 characters').isLength({ min: 3 }),
    body('description', 'Enter description with minimum 3 characters').isLength({ min: 3 }),
], async (req, res) => {
    try {
        const { title, description, tag } = req.body;
        // checking is there is any error in this validation or not if yes then send errors to user
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array()[0].msg });

        //create a new note object
        const newNote = {};
        if (title) { newNote.title = title };
        if (description) { newNote.description = description };
        if (tag) { newNote.tag = tag };

        // find the note and update it
        let note = await Notes.findById(req.params.id);
        if (!note) return res.status(404).json({ success: false, response: "Note not found" })
        if (note.user.toString() !== req.user.id) return res.status(401).json({ success: false, response: "Unauthorised Access" })
        note = await Notes.findByIdAndUpdate(req.params.id, { $set: newNote }, { new: true })
        res.json({ success: true, response: note })
    } catch (error) {
        console.error(error.msg)
        res.status(500).json({ success: false, response: error.message })
    }
})

// Route 4: Delete notes       login reqired
router.delete('/deletenote/:id', fetchuser, async (req, res) => {
    try {
        // find the note and delete it
        let note = await Notes.findById(req.params.id);
        if (!note) return res.status(404).json({ success: false, response: "Note not found" })
        if (note.user.toString() !== req.user.id) return res.status(401).json({ success: false, response: "Unauthorised Access" })

        note = await Notes.findByIdAndDelete(req.params.id)
        res.json({ success: true, response: "note has been deleted", note: note })
    } catch (error) {
        console.error(error.msg)
        res.status(500).json({ success: false, response: error.message })
    }
})

module.exports = router;