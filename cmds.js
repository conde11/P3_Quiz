const {log, biglog, errorlog,colorize}=require ("./out");
const {models} = require ('./model');
const Sequelize = require ('sequelize');

exports.helpCmd = rl =>{
    log("Commandos:");
    log(" h|help - Muestra esta ayuda.");
    log(" list - Listas los quizzes existentes.");
    log(" show<id> - Muestra la pregunta y la respuesta el quiz indicado.");
    log(" add - Añadir un nuevo quiz interactivamente");
    log("delete <id> - Borrar el quiz indicado");
    log(" edit <id> - Editar el quiz indicado.");
    log("test <id> - Probar el quiz indicado. ");
    log("p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log("credits - Creditos.");
    log("q|quit - Salir del programa.");
    rl.prompt();
};


const makeQuestion = (rl, text)=> {
    return new Sequelize.Promise ((resolve, reject)=>
    {
        rl.question (colorize(text, 'red'), answer=>{
            resolve(answer.trim());
        });
    });
};

exports.addCmd = rl =>
{
    makeQuestion(rl, 'introduzca una pregunta: ')
        .then(q=>{
            return makeQuestion (rl, 'Introduzca la respuesta ')

                .then(a=>{
                    return {question: q, answer: a};
                })
                .then(quiz=>{
                    return models.quiz.create(quiz);
                })
                .then(quiz=> {
                    log(` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
                })
                .catch (Sequelize.ValidationError, error =>{
                    errorlog('El quiz es erroneo:');
                    error.errors.forEach(({message})=> errorlog(message));
                })
                .catch(error=>{
                    errorlog(error.message);
                })
                .then(()=>{
                    rl.prompt();
                });
        });

};

exports.listCmd = rl =>
{
    models.quiz.findAll()
        .each(quiz => {
                log(`[${colorize(quiz.id, 'magenta')}}: ${quiz.question}`);
            })
        .catch(error=>{
            errorlog(error.message);
        })
        .then(()=>{
            rl.prompt();
        });
};

//promesa
const validateId = id => {
    return new Sequelize.Promise ((resolve, reject)=>{
        if(typeof id === "undefined"){
            reject(new Error  (`Falta el parametro <id> .`));

        }else {
            id = parseInt(id); //convertir en un numero
            if (Number.isNaN(id)){
                reject (new Error (`El valor del parametro <id> no es un número.`)); //no va bien
            }else {
                resolve(id);  //si la cosa va bien
            }
        }
    });
};

exports.showCmd  = (rl,id) =>
{
   validateId (id)
       .then (id => models.quiz.findById(id))
       .then (quiz => {
           if (!quiz) {
               throw new Error(`No existe un quiz asociado al id = ${id}.`);
           }
           log(`[${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
       })
       .catch (error => {
       errorlog(error.message);
       })
       .then(()=>{
       rl.prompt();
});
};

exports.testCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }

            return  makeQuestion(rl, `${quiz.question}? `)
                .then(answer => {
                    console.log("Su respuesta es:");

                    if (answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase()) {
                        log("CORRECTO", "green");
                    } else {
                        log("INCORRECTO", "red");
                    }
                });
        })
        .catch(error => {
            errorlog(error.message);
        }).then(() => {
        rl.prompt();
    });
};



exports.playCmd =rl => {
    let score = 0;
    let toBePlayed = [];

    models.quiz.findAll({raw:true})
        .then(quizzes =>{
            toBePlayed=quizzes;
        });
    const playOne =() =>{
        return Promise.resolve()
            .then(()=>{
                if(toBePlayed.length<=0){
                    log('No hay nada más que preguntar.');
                    log(`Final del juego. Aciertos: ${score}`);
                    biglog(`${score}`, 'magenta');
                    return;
                }
                let pos= Math.floor(Math.random()*toBePlayed.length);
                let quiz = toBePlayed[pos];
                toBePlayed.splice(pos,1);
                return makeQuestion(rl,`${quiz.question} `)
                    .then(answer =>{
                        if(answer.toLowerCase().trim()===quiz.answer.toLowerCase().trim()){
                            score++;
                            log(`CORRECTO - Lleva ${score} ${colorize(' aciertos')}`);
                            return playOne();

                        }else{
                            log('INCORRECTO.');

                            log(`Fin del juego. Aciertos: ${score}`);
                            biglog(`${score}`, 'magenta');
                        }
                    }
                    )
            })
    };
    models.quiz.findAll({raw:true})
        .then(quizzes=>{
            toBePlayed=quizzes;
        })
        .then(()=>{
            return playOne();
        })
        .catch(e=>{
            console.log("Error: " + e);
        })
        .then(()=>{
            console.log(score);
            rl.prompt();

        })

};




exports.deleteCmd = (rl,id) =>
{
    validateId (id)
        .then (id => models.quiz.destroy({where: {id}}))
        .catch(error =>{
            errorlog(error.message);
        })
        .then(()=>{
            rl.prompt();
        });

};
exports.editCmd = (rl,id) =>
{
    validateId (id)
        .then (id => models.quiz.findById(id))
        .then (quiz => {
            if(!quiz){
                throw new Error (`No existe un quiz asociado al id=${id}.`);

            }
            process.stdout.isTTY && setTimeout(()=> {rl.write(quiz.question)},0);
            return makeQuestion(rl, 'Introduzca la pregunta: ')
                .then(q=>{
                    process.stdout.isTTY && setTimeout(()=> {rl.write(quiz.answer)},0);
                    return makeQuestion (rl, 'Introduzca la respuesta ')
                        .then (a =>{
                            quiz.question=q;
                            quiz.answer=a;
                            return quiz;
                        });
                });
        })
        .then (quiz=>{
            return quiz.save();
        })
        .then (quiz =>
        {
            log(`Se ha cambiado el quiz ${colorize(quiz.id,'magenta')} por: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer} `);
        })
        .catch(Sequelize.ValidationError, error=>{
            errorlog('El quiz es erroneo:');
            error.erros.forEach(({message})=> errorlog(message));
        })
        .catch(error =>{
            errorlog(error.message);
        })
        .then(()=>{
            rl.prompt();
        });
};

exports.creditsCmd = rl =>
{

    log('CRISTINA GONZALEZ Y DANIEL CONDE PARRAGA');

    rl.prompt();
};
exports.quitCmd = rl => {
    rl.close();
    rl.prompt();
};

